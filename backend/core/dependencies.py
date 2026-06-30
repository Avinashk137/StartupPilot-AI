from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import logging

from .supabase_client import supabase_admin

logger = logging.getLogger(__name__)

security_scheme = HTTPBearer()
optional_security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
):
    """
    Validate the Bearer token against Supabase and return the authenticated user.
    Uses the admin client's get_user() to verify the JWT.
    Raises a 401 with a specific error message if the token is invalid or expired.
    """
    token = credentials.credentials

    try:
        response = supabase_admin.auth.get_user(token)
        user = response.user
        if not user:
            logger.warning("get_user returned no user for provided token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token. Please sign in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user

    except HTTPException:
        raise
    except Exception as e:
        raw = str(e).lower()
        logger.warning("Token validation failed: %s", str(e))

        if "expired" in raw or "jwt expired" in raw:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Your session has expired. Please sign in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if "invalid" in raw or "malformed" in raw or "not found" in raw:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token. Please sign in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Network / unexpected error — not an auth failure, signal service issue
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is temporarily unavailable. Please try again shortly.",
        )


async def get_current_admin(current_user=Depends(get_current_user)):
    """Require the authenticated user to have the 'admin' role."""
    role = (
        current_user.user_metadata.get("role", "user")
        if current_user.user_metadata
        else "user"
    )
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions. Admin access required.",
        )
    return current_user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        optional_security_scheme
    ),
):
    """Return the user if a valid token is provided, otherwise return None."""
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
