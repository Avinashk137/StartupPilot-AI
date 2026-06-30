from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
import logging
import traceback

from ..core.dependencies import get_current_user
from ..core.supabase_client import supabase_client, supabase_admin, create_fresh_public_client
from ..core.config import settings

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Request / Response Models ──────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str

    @field_validator("full_name")
    @classmethod
    def full_name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Full name is required")
        if len(v) < 2:
            raise ValueError("Full name must be at least 2 characters")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    access_token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("New password must be at least 8 characters")
        return v


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("New password must be at least 8 characters")
        return v


# ── Helpers ────────────────────────────────────────────────────────────────────

def user_to_dict(user) -> dict:
    """Convert a Supabase User object to a serialisable dict."""
    meta = user.user_metadata or {}
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": meta.get("full_name", ""),
        "role": meta.get("role", "user"),
        "avatar_url": meta.get("avatar_url"),
        "bio": meta.get("bio"),
        "company": meta.get("company"),
        "phone": meta.get("phone"),
        "created_at": str(user.created_at) if user.created_at else None,
        "last_sign_in_at": str(user.last_sign_in_at) if user.last_sign_in_at else None,
    }


def _parse_supabase_auth_error(e: Exception) -> str:
    """
    Convert raw Supabase / gotrue error messages into user-friendly text.
    Also logs the real error for developers.
    """
    raw = str(e)
    logger.error("Supabase auth error: %s", raw)

    lower = raw.lower()

    # Sign-up errors
    if "user already registered" in lower or "already been registered" in lower:
        return "An account with this email address already exists. Please sign in instead."
    if "invalid email" in lower or "unable to validate email" in lower:
        return "The email address you entered is not valid. Please check and try again."
    if "password should be at least" in lower or "password is too short" in lower:
        return "Password must be at least 8 characters long."
    if "signup is disabled" in lower:
        return "Account registration is currently disabled. Please contact support."

    # Sign-in errors
    if "invalid login credentials" in lower or "invalid credentials" in lower:
        return "Incorrect email or password. Please check your credentials and try again."
    if "email not confirmed" in lower:
        return "Please confirm your email address before signing in. Check your inbox for the confirmation link."
    if "user not found" in lower:
        return "No account found with this email address. Please register first."
    if "too many requests" in lower or "rate limit" in lower:
        return "Too many attempts. Please wait a few minutes before trying again."

    # Token / session errors
    if "refresh_token_not_found" in lower or "invalid refresh token" in lower:
        return "Your session has expired. Please sign in again."
    if "token has expired" in lower or "jwt expired" in lower:
        return "Your session token has expired. Please sign in again."

    # Network / config errors
    if "connection" in lower or "network" in lower or "timeout" in lower:
        return "Unable to connect to the authentication service. Please check your internet connection."
    if "missing" in lower and ("url" in lower or "key" in lower):
        return "Authentication service is misconfigured. Please contact support."

    # Generic fallback — still show raw message in dev, generic in prod
    if settings.DEBUG:
        return f"Authentication error: {raw}"
    return "An unexpected error occurred. Please try again."


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/register", status_code=201)
async def register(request: RegisterRequest):
    """
    Register a new user.

    - If email confirmation is DISABLED in Supabase: returns tokens immediately.
    - If email confirmation is ENABLED: returns a message asking user to confirm email.
    """
    logger.info("[AUTH:REGISTER] Attempting registration for email=%s", request.email)
    try:
        fresh = create_fresh_public_client()
        res = fresh.auth.sign_up({
            "email": request.email,
            "password": request.password,
            "options": {
                "data": {
                    "full_name": request.full_name,
                    "role": "user",
                }
            }
        })

        logger.info(
            "[AUTH:REGISTER] Supabase response: user=%s, session=%s",
            res.user.id if res.user else None,
            "present" if res.session else "None",
        )

        if res.user is None:
            logger.error("[AUTH:REGISTER] Supabase returned no user for email=%s", request.email)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed. The authentication service did not return a user. Please try again.",
            )

        if res.session is None:
            # Email confirmation is enabled — user exists but needs to verify email
            logger.info("[AUTH:REGISTER] Email confirmation required for email=%s, user_id=%s", request.email, res.user.id)
            return {
                "success": True,
                "email_confirmation_required": True,
                "message": (
                    f"Account created! We've sent a confirmation email to {request.email}. "
                    "Please check your inbox and click the link to activate your account."
                ),
                "user": user_to_dict(res.user),
            }

        # Email confirmation disabled — user is immediately logged in
        logger.info(
            "[AUTH:REGISTER] Registration successful: user_id=%s, email=%s, has_access_token=%s",
            res.user.id, res.user.email, bool(res.session.access_token),
        )
        return TokenResponse(
            access_token=res.session.access_token,
            refresh_token=res.session.refresh_token,
            user=user_to_dict(res.user),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("[AUTH:REGISTER] Registration failed: %s\n%s", str(e), traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_parse_supabase_auth_error(e),
        )


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """Authenticate a user and return access + refresh tokens."""
    logger.info("[AUTH:LOGIN] Login attempt for email=%s", request.email)
    try:
        fresh = create_fresh_public_client()
        res = fresh.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password,
        })

        if not res.session or not res.user:
            logger.warning(
                "[AUTH:LOGIN] sign_in_with_password returned no session/user for email=%s. "
                "session=%s, user=%s",
                request.email, res.session, res.user,
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Login failed. Please check your credentials and try again.",
            )

        logger.info(
            "[AUTH:LOGIN] Login successful: user_id=%s, email=%s, "
            "access_token_len=%d, refresh_token_len=%d",
            res.user.id, res.user.email,
            len(res.session.access_token), len(res.session.refresh_token),
        )

        return TokenResponse(
            access_token=res.session.access_token,
            refresh_token=res.session.refresh_token,
            user=user_to_dict(res.user),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "[AUTH:LOGIN] Login failed for email=%s: %s\n%s",
            request.email, str(e), traceback.format_exc(),
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_parse_supabase_auth_error(e),
        )


@router.post("/logout")
async def logout(current_user=Depends(get_current_user)):
    """
    Sign the user out on the server side.
    Frontend should also clear localStorage after calling this.
    """
    try:
        fresh = create_fresh_public_client()
        fresh.auth.sign_out()
        return {"success": True, "message": "Signed out successfully."}
    except Exception as e:
        logger.warning("Logout error (non-critical): %s", str(e))
        # Always return success to the client — local state is cleared regardless
        return {"success": True, "message": "Signed out."}


@router.post("/refresh")
async def refresh_token(request: RefreshRequest):
    """Exchange a refresh token for a new access token."""
    try:
        fresh = create_fresh_public_client()
        res = fresh.auth.refresh_session(request.refresh_token)

        if not res.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session refresh failed. Please sign in again.",
            )

        return {
            "access_token": res.session.access_token,
            "refresh_token": res.session.refresh_token,
            "token_type": "bearer",
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_parse_supabase_auth_error(e),
        )


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """
    Send a password reset email to the user.
    Uses the admin client to call Supabase password reset API.
    Always returns success (to prevent email enumeration attacks).
    """
    try:
        # redirect_to should match your Supabase Dashboard → Auth → URL Config redirect allowlist
        redirect_to = f"{settings.FRONTEND_URL}/reset-password"
        supabase_admin.auth.reset_password_email(
            request.email,
            options={"redirect_to": redirect_to},
        )
    except Exception as e:
        # Log the real error but don't reveal it to prevent email enumeration
        logger.error("Forgot password error for %s: %s", request.email, str(e))

    # Always return the same response whether or not the email exists
    return {
        "success": True,
        "message": (
            f"If an account exists for {request.email}, "
            "you will receive a password reset link shortly. "
            "Please check your inbox and spam folder."
        ),
    }


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """
    Update password using the access token from the reset email link.
    The frontend extracts this token from the URL hash after Supabase redirect.
    """
    logger.info("[AUTH:RESET_PASSWORD] Password reset attempt, token_len=%d", len(request.access_token))
    try:
        # CRITICAL FIX: Create a FRESH client instead of mutating the shared singleton.
        # Previously this did `user_client = supabase_client` which mutated the
        # global client's session state, corrupting auth for all other users.
        fresh_client = create_fresh_public_client()
        fresh_client.auth.set_session(request.access_token, "")

        res = fresh_client.auth.update_user({"password": request.new_password})

        if not res.user:
            logger.warning("[AUTH:RESET_PASSWORD] update_user returned no user")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password reset failed. Your reset link may have expired. Please request a new one.",
            )

        logger.info("[AUTH:RESET_PASSWORD] Password updated for user_id=%s", res.user.id)
        return {"success": True, "message": "Password updated successfully. You can now sign in with your new password."}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("[AUTH:RESET_PASSWORD] Failed: %s\n%s", str(e), traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_parse_supabase_auth_error(e),
        )


@router.get("/me")
async def get_me(current_user=Depends(get_current_user)):
    """Get the currently authenticated user's profile."""
    return {"success": True, "data": user_to_dict(current_user)}


@router.put("/profile")
async def update_profile(
    request: ProfileUpdate,
    current_user=Depends(get_current_user),
):
    """Update the authenticated user's profile metadata."""
    updates = {k: v for k, v in request.model_dump().items() if v is not None}
    if not updates:
        return {"success": True, "data": user_to_dict(current_user)}

    try:
        res = supabase_admin.auth.admin.update_user_by_id(
            str(current_user.id),
            {"user_metadata": updates},
        )
        return {
            "success": True,
            "data": user_to_dict(res.user),
            "message": "Profile updated successfully.",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_parse_supabase_auth_error(e),
        )


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user=Depends(get_current_user),
):
    """
    Change the authenticated user's password.
    Uses the admin client to update by user ID — safe because user is already authenticated via JWT.
    """
    try:
        res = supabase_admin.auth.admin.update_user_by_id(
            str(current_user.id),
            {"password": request.new_password},
        )

        if not res.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password change failed. Please try again.",
            )

        return {"success": True, "message": "Password changed successfully."}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_parse_supabase_auth_error(e),
        )
