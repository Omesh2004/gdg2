import asyncio
import base64
import hashlib
import hmac
import json
import time
import uuid
import re
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

from fastapi import HTTPException, status
from pydantic import BaseModel
import psycopg

from app.core.config import settings
from app.core.rbac import Role

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"


class AuthProfile(BaseModel):
    id: str
    email: str
    fullName: str
    role: str
    avatarUrl: str | None


ROLE_PRIORITY: dict[str, int] = {
    Role.ADMIN.value: 5,
    Role.SECURITY.value: 4,
    Role.STAFF.value: 3,
    Role.MAINTENANCE.value: 2,
    Role.GUEST.value: 1,
}


def _normalize_role(role: str | None) -> str:
    value = str(role or "").strip().lower()
    if value in ROLE_PRIORITY:
        return value
    return Role.GUEST.value


def _choose_highest_role(candidates: list[str | None]) -> str:
    normalized = [_normalize_role(candidate) for candidate in candidates if candidate is not None]
    if not normalized:
        return Role.GUEST.value
    return max(normalized, key=lambda role: ROLE_PRIORITY.get(role, 0))


def resolve_user_role_by_email(email: str, fallback_role: str | None = None) -> str:
    """Resolve the effective role for a user email from the database.

    Resolution order:
    1. Supabase REST API over HTTPS (if configured)
    2. Direct Postgres connection
    """
    normalized_email = str(email).strip().lower()

    if not normalized_email:
        return _normalize_role(fallback_role)

    # 1. Try Supabase REST API over HTTPS (works from Docker)
    rest_role = _resolve_role_via_rest_api(normalized_email)
    if rest_role is not None:
        print(f"[auth] Role for {normalized_email}: {rest_role} (from Supabase REST API)")
        return _normalize_role(rest_role)

    # 2. Direct Postgres connection
    try:
        pg_role = _resolve_role_via_postgres(normalized_email)
        if pg_role is not None:
            print(f"[auth] Role for {normalized_email}: {pg_role} (from Postgres)")
            return _normalize_role(pg_role)
    except Exception as exc:
        print(f"[auth-warning] Postgres role lookup failed: {exc}")

    result = _normalize_role(fallback_role)
    print(f"[auth] Role for {normalized_email}: {result} (fallback)")
    return result


def _resolve_role_via_rest_api(email: str) -> str | None:
    """Query Supabase PostgREST API over HTTPS for the user's role."""
    supabase_url = settings.SUPABASE_URL.strip().rstrip("/")
    service_key = settings.SUPABASE_SERVICE_KEY.strip()

    if not supabase_url or not service_key:
        return None

    for table in ("profiles", "oauth_login_profiles"):
        try:
            url = f"{supabase_url}/rest/v1/{table}?email=eq.{quote(email)}&select=role&limit=1"
            req = Request(url, headers={
                "apikey": service_key,
                "Authorization": f"Bearer {service_key}",
                "Accept": "application/json",
            })
            with urlopen(req, timeout=5) as resp:
                rows = json.loads(resp.read().decode("utf-8"))
                if rows and rows[0].get("role"):
                    return str(rows[0]["role"])
        except Exception as exc:
            print(f"[auth-warning] REST API lookup in {table} failed: {exc}")
            continue

    return None


def _resolve_role_via_postgres(email: str) -> str | None:
    """Query Supabase Postgres directly for the user's role."""
    db_url = _normalized_database_url()

    profiles_role: str | None = None
    oauth_role: str | None = None

    with psycopg.connect(db_url, connect_timeout=5) as conn:
        conn.autocommit = True
        with conn.cursor() as cur:
            try:
                cur.execute(
                    """
                    select role
                    from public.profiles
                    where lower(email) = %s
                    limit 1
                    """,
                    (email,),
                )
                row = cur.fetchone()
                if row:
                    profiles_role = str(row[0])
            except Exception:
                pass

            try:
                cur.execute(
                    """
                    select role
                    from public.oauth_login_profiles
                    where lower(email) = %s
                    limit 1
                    """,
                    (email,),
                )
                row = cur.fetchone()
                if row:
                    oauth_role = str(row[0])
            except Exception:
                pass

    if profiles_role is not None:
        return profiles_role
    if oauth_role is not None:
        return oauth_role
    return None


def _normalized_database_url() -> str:
    raw_url = settings.SUPABASE_SYNC_DATABASE_URL.strip() or settings.DATABASE_URL.strip() or settings.SUPABASE_POSTGRES_DIRECT_URL.strip()
    if not raw_url:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database URL is not configured.")

    match = re.match(r"^postgresql://([^:]+):([^@]+)@(.+)$", raw_url)
    if not match:
        return raw_url

    user, password, rest = match.groups()
    if password.startswith("[") and password.endswith("]"):
        password = password[1:-1]

    # Encode reserved characters in password so libpq can parse reliably.
    encoded_password = quote(password, safe="")
    return f"postgresql://{user}:{encoded_password}@{rest}"


def upsert_login_profile(profile: AuthProfile) -> AuthProfile:
    db_url = _normalized_database_url()
    effective_role = resolve_user_role_by_email(profile.email, fallback_role=profile.role)

    with psycopg.connect(db_url) as conn:
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute(
                """
                create table if not exists public.oauth_login_profiles (
                  id uuid primary key default gen_random_uuid(),
                  email text unique not null,
                  full_name text not null,
                  role text not null default 'staff',
                  avatar_url text,
                  provider text not null default 'google',
                  provider_sub text,
                  last_login_at timestamptz not null default now(),
                  created_at timestamptz not null default now(),
                  updated_at timestamptz not null default now()
                )
                """
            )
            cur.execute(
                """
                                insert into public.oauth_login_profiles (email, full_name, avatar_url, role)
                                values (%s, %s, %s, %s)
                on conflict (email)
                do update set
                  full_name = excluded.full_name,
                  avatar_url = excluded.avatar_url,
                                    role = excluded.role,
                  last_login_at = now(),
                  updated_at = now()
                returning id, email, full_name, role, avatar_url
                """,
                                (profile.email, profile.fullName, profile.avatarUrl, effective_role),
            )
            row = cur.fetchone()

            # Best-effort mirror into existing profiles table if it supports direct inserts.
            try:
                cur.execute(
                    """
                    insert into public.profiles (id, full_name, email, role, avatar_url, last_login_at)
                    values (%s, %s, %s, %s, %s, now())
                    on conflict (id)
                    do update set
                      full_name = excluded.full_name,
                      email = excluded.email,
                                            role = excluded.role,
                      avatar_url = excluded.avatar_url,
                      last_login_at = now(),
                      updated_at = now()
                    """,
                                        (profile.id, profile.fullName, profile.email, effective_role, profile.avatarUrl),
                )
            except Exception:
                # Ignore incompatibility (e.g., FK to auth.users) and rely on oauth_login_profiles.
                pass

    if row:
        return AuthProfile(
            id=str(row[0]),
            email=str(row[1]),
            fullName=str(row[2]),
            role=str(row[3]),
            avatarUrl=row[4],
        )

    return profile


def build_google_authorize_url(redirect_uri: str, state: str) -> str:
    if not settings.GOOGLE_OAUTH_CLIENT_ID or not settings.GOOGLE_OAUTH_CLIENT_SECRET:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Google OAuth is not configured.")

    params = {
        "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


def exchange_code_for_tokens(code: str, redirect_uri: str) -> dict[str, Any]:
    payload = urlencode(
        {
            "code": code,
            "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
            "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }
    ).encode("utf-8")

    request = Request(
        GOOGLE_TOKEN_URL,
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=15) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="ignore")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Google token exchange failed: {error_body}") from exc
    except URLError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to reach Google token endpoint.") from exc


def fetch_google_userinfo(access_token: str) -> dict[str, Any]:
    request = Request(
        GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        method="GET",
    )

    try:
        with urlopen(request, timeout=15) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="ignore")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Google userinfo lookup failed: {error_body}") from exc
    except URLError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to reach Google userinfo endpoint.") from exc


def build_profile_from_google_userinfo(userinfo: dict[str, Any]) -> AuthProfile:
    google_sub = str(userinfo.get("sub", ""))
    email = str(userinfo.get("email", ""))
    full_name = str(userinfo.get("name") or userinfo.get("given_name") or email.split("@")[0] or "Operator")
    avatar_url = userinfo.get("picture")

    stable_uuid = str(uuid.uuid5(uuid.NAMESPACE_URL, f"google:{google_sub or email}"))

    try:
        role = resolve_user_role_by_email(email, fallback_role=Role.GUEST.value)
    except Exception as exc:
        print(f"[auth-warning] DB role lookup failed, falling back to guest: {exc}")
        role = Role.GUEST.value

    return AuthProfile(
        id=stable_uuid,
        email=email,
        fullName=full_name,
        role=role,
        avatarUrl=avatar_url,
    )


def create_session_token(profile: AuthProfile) -> str:
    now = int(time.time())
    payload = {
        "sub": profile.id,
        "email": profile.email,
        "full_name": profile.fullName,
        "role": profile.role,
        "avatar_url": profile.avatarUrl,
        "iat": now,
        "exp": now + settings.SESSION_TTL_MINUTES * 60,
    }
    return encode_signed_token(payload)


def decode_signed_token(token: str) -> dict[str, Any]:
    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session token.")

    signing_input = f"{parts[0]}.{parts[1]}"
    expected_signature = hmac.new(settings.SESSION_JWT_SECRET.encode(), signing_input.encode(), hashlib.sha256).digest()
    actual_signature = _base64url_decode(parts[2])

    if not hmac.compare_digest(expected_signature, actual_signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session token.")

    payload = json.loads(_base64url_decode(parts[1]).decode("utf-8"))
    exp = int(payload.get("exp", 0))
    if exp and exp < int(time.time()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired.")

    return payload


def create_state_token(return_to: str) -> str:
    now = int(time.time())
    payload = {
        "return_to": return_to,
        "iat": now,
        "exp": now + 600,
    }
    return encode_signed_token(payload)


def decode_state_token(token: str) -> dict[str, Any]:
    return decode_signed_token(token)


def encode_signed_token(payload: dict[str, Any]) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    encoded_header = _base64url_encode(json.dumps(header, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    encoded_payload = _base64url_encode(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    signing_input = f"{encoded_header}.{encoded_payload}"
    signature = hmac.new(settings.SESSION_JWT_SECRET.encode(), signing_input.encode(), hashlib.sha256).digest()
    return f"{signing_input}.{_base64url_encode(signature)}"


def _base64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _base64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


async def exchange_code_and_load_profile(code: str, redirect_uri: str) -> AuthProfile:
    token_data = await asyncio.to_thread(exchange_code_for_tokens, code, redirect_uri)
    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google did not return an access token.")

    userinfo = await asyncio.to_thread(fetch_google_userinfo, str(access_token))
    if not userinfo.get("email"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google profile did not include an email address.")

    profile = build_profile_from_google_userinfo(userinfo)
    try:
        profile = await asyncio.to_thread(upsert_login_profile, profile)
    except Exception as exc:
        # Keep OAuth login functional even if DB sync is temporarily unavailable.
        print(f"[auth-sync-warning] Failed to sync login profile: {exc}")

    return profile