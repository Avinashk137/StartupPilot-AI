from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from .supabase_client import supabase_client

security_scheme = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        response = supabase_client.auth.get_user(credentials.credentials)
        user = response.user
        if not user:
            raise credentials_exception
        return user
    except Exception as e:
        raise credentials_exception

async def get_current_admin(current_user=Depends(get_current_user)):
    # Assuming role is stored in user_metadata or similar.
    # In a full app, you might fetch a custom "profiles" table if role isn't in auth.
    role = current_user.user_metadata.get("role", "user") if current_user.user_metadata else "user"
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions. Admin access required.",
        )
    return current_user

async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
):
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
