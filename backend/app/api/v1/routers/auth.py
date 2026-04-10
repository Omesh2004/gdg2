from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse, RedirectResponse
from urllib.parse import urlparse

from app.core.auth import create_state_token, decode_state_token, get_current_user
from app.core.config import settings
from app.services.auth_service import build_google_authorize_url, create_session_token, exchange_code_and_load_profile

router = APIRouter(prefix="/auth")


def _public_callback_url(request: Request) -> str:
    """Build the public-facing OAuth callback URL.
    
    Inside Docker, request.url_for() returns internal hostnames like
    'http://backend:8000/...' which are unreachable from the browser and
    Google's servers.  We derive the public URL from FRONTEND_URL instead,
    swapping the port to the backend's 8000.
    """
    parsed_frontend = urlparse(settings.FRONTEND_URL)
    # Use the same scheme and hostname as the frontend but target port 8000
    public_host = parsed_frontend.hostname or "localhost"
    scheme = parsed_frontend.scheme or "http"
    # Use actual request port if possible, otherwise default to 8000
    backend_port = request.url.port or 8000
    return f"{scheme}://{public_host}:{backend_port}/api/v1/auth/callback"


@router.get("/login")
async def login(request: Request, return_to: str | None = Query(default=None)):
    frontend_return_to = return_to or f"{settings.FRONTEND_URL}/auth/callback"
    callback_url = _public_callback_url(request)
    state = create_state_token(frontend_return_to)
    authorize_url = build_google_authorize_url(callback_url, state)
    return RedirectResponse(authorize_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@router.get("/callback", name="google_oauth_callback")
async def callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
):
    if error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)

    if not code or not state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing OAuth callback parameters.")

    state_payload = decode_state_token(state)
    return_to = str(state_payload.get("return_to") or f"{settings.FRONTEND_URL}/auth/callback")
    callback_url = _public_callback_url(request)
    profile = await exchange_code_and_load_profile(code, callback_url)
    session_token = create_session_token(profile)

    redirect_response = RedirectResponse(return_to, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    redirect_response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        secure=request.url.scheme == "https",
        samesite="lax",
        max_age=settings.SESSION_TTL_MINUTES * 60,
        path="/",
    )
    return redirect_response


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    return current_user.model_dump()


@router.post("/logout")
async def logout():
    json_response = JSONResponse({"ok": True})
    json_response.delete_cookie(key=settings.SESSION_COOKIE_NAME, path="/")
    return json_response