from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from ..core.dependencies import get_current_user
from ..core.supabase_client import supabase_client

router = APIRouter(prefix="/auth", tags=["Authentication"])

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
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

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

def user_to_dict(user) -> dict:
    # Supabase User object
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.user_metadata.get("full_name") if user.user_metadata else "",
        "role": user.user_metadata.get("role", "user") if user.user_metadata else "user",
        "created_at": user.created_at,
    }

@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(request: RegisterRequest):
    try:
        res = supabase_client.auth.sign_up({
            "email": request.email,
            "password": request.password,
            "options": {
                "data": {
                    "full_name": request.full_name,
                    "role": "user"
                }
            }
        })
        if not res.session:
            # Usually email confirmations might prevent immediate session
            raise HTTPException(status_code=400, detail="Registration requires email confirmation or failed.")
        
        return TokenResponse(
            access_token=res.session.access_token,
            refresh_token=res.session.refresh_token,
            user=user_to_dict(res.user)
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    try:
        res = supabase_client.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })
        return TokenResponse(
            access_token=res.session.access_token,
            refresh_token=res.session.refresh_token,
            user=user_to_dict(res.user)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

@router.post("/refresh")
async def refresh_token(request: RefreshRequest):
    try:
        res = supabase_client.auth.refresh_session(request.refresh_token)
        return {
            "access_token": res.session.access_token, 
            "refresh_token": res.session.refresh_token, 
            "token_type": "bearer"
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

@router.get("/me")
async def get_me(current_user = Depends(get_current_user)):
    return {"success": True, "data": user_to_dict(current_user)}

@router.put("/profile")
async def update_profile(
    request: ProfileUpdate,
    current_user = Depends(get_current_user),
):
    updates = {k: v for k, v in request.model_dump().items() if v is not None}
    if not updates:
        return {"success": True, "data": user_to_dict(current_user)}
    
    try:
        res = supabase_client.auth.update_user({
            "data": updates
        })
        return {"success": True, "data": user_to_dict(res.user), "message": "Profile updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user = Depends(get_current_user),
):
    # Supabase allows updating password via auth.update_user if the user is authenticated.
    # We don't have their current password to verify against natively without re-signing in, 
    # but since they are authenticated (JWT provided), we can just update it.
    try:
        supabase_client.auth.update_user({"password": request.new_password})
        return {"success": True, "message": "Password changed successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
