import base64
import hashlib
import hmac
import json
import time
from typing import Any

from fastapi import Cookie, HTTPException, Request, status

from app.core.config import settings
from app.services.auth_service import AuthProfile, decode_signed_token


def _safe_json_loads(value: str) -> dict[str, Any]:
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid auth token.") from exc

    if not isinstance(parsed, dict):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid auth token.")

    return parsed


def create_session_claims(profile: AuthProfile) -> dict[str, Any]:
    now = int(time.time())
    return {
        "sub": profile.id,
        "email": profile.email,
        "full_name": profile.fullName,
        "role": profile.role,
        "avatar_url": profile.avatarUrl,
        "iat": now,
        "exp": now + settings.SESSION_TTL_MINUTES * 60,
    }


def create_state_token(return_to: str) -> str:
    now = int(time.time())
    payload = {
        "return_to": return_to,
        "iat": now,
        "exp": now + 600,
    }
    return encode_signed_token(payload)


def encode_signed_token(payload: dict[str, Any]) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    signing_input = f"{_base64url_encode(json.dumps(header, separators=(',', ':'), sort_keys=True).encode())}.{_base64url_encode(json.dumps(payload, separators=(',', ':'), sort_keys=True).encode())}"
    signature = hmac.new(settings.SESSION_JWT_SECRET.encode(), signing_input.encode(), hashlib.sha256).digest()
    return f"{signing_input}.{_base64url_encode(signature)}"


def decode_state_token(token: str) -> dict[str, Any]:
    return decode_signed_token(token)


def get_session_cookie_name() -> str:
    return settings.SESSION_COOKIE_NAME


def _base64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


async def get_current_user(request: Request) -> AuthProfile:
    token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = decode_signed_token(token)
    return AuthProfile(
        id=str(payload.get("sub", "")),
        email=str(payload.get("email", "")),
        fullName=str(payload.get("full_name", "")),
        role=str(payload.get("role", "staff")),
        avatarUrl=payload.get("avatar_url"),
    )