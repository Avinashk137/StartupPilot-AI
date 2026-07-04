"""
settings.py — User Settings API

Endpoints:
  GET  /settings  → Fetch user settings (auto-creates defaults if missing)
  PUT  /settings  → Partial-update user settings (merge, not replace)
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from typing import Any, Dict
import structlog

from ..core.supabase_client import supabase_admin
from .auth import get_current_user

router = APIRouter(prefix="/settings", tags=["Settings"])
logger = structlog.get_logger()

# ── Default settings (single source of truth) ─────────────────────────────────
DEFAULT_SETTINGS: Dict[str, Any] = {
    "theme": "system",
    "ai_quality": "balanced",
    "ai_provider": "auto",
    "auto_retry": True,
    "max_retries": 3,
    "retry_delay_seconds": 10,
    "email_notifications": True,
    "ai_notifications": True,
    "weekly_reports": False,
    "browser_notifications": False,
    "desktop_notifications": False,
    "default_download_format": "pdf",
    "open_reports_in": "current",
    "auto_save_reports": True,
    "auto_backup_reports": True,
    "date_format": "DD/MM/YYYY",
    "project_sorting": "newest",
    "default_status_filter": "all",
    "parallel_agents": True,
    "smart_cache": True,
    "background_processing": True,
    "session_timeout": "1h",
    "remember_login": True,
}

# ── Allowed field names (whitelist) ────────────────────────────────────────────
ALLOWED_FIELDS = set(DEFAULT_SETTINGS.keys())


def _ensure_settings_table():
    """Create the user_settings table via RPC if it doesn't exist yet."""
    try:
        supabase_admin.rpc("create_user_settings_table_if_not_exists").execute()
    except Exception:
        pass  # Table may already exist; ignore


@router.get("")
async def get_settings(current_user: dict = Depends(get_current_user)):
    """
    Fetch the current user's settings.
    If no row exists, creates one with defaults and returns them.
    """
    user_id = current_user.id

    try:
        res = supabase_admin.table("user_settings") \
            .select("*") \
            .eq("user_id", user_id) \
            .maybe_single() \
            .execute()

        if res.data:
            # Merge stored data with defaults (in case new columns were added)
            merged = {**DEFAULT_SETTINGS, **{k: v for k, v in res.data.items()
                                              if k in ALLOWED_FIELDS and v is not None}}
            return merged

        # No row yet — upsert defaults
        new_row = {"user_id": user_id, **DEFAULT_SETTINGS}
        supabase_admin.table("user_settings").upsert(new_row).execute()
        return DEFAULT_SETTINGS

    except Exception as e:
        logger.error("Failed to fetch user settings", user_id=user_id, error=str(e))
        # Return defaults gracefully so the page never crashes
        return DEFAULT_SETTINGS


class SettingsUpdateRequest(BaseModel):
    model_config = {"extra": "allow"}

@router.put("")
async def update_settings(
    updates: SettingsUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Partial-update user settings.
    Only fields listed in ALLOWED_FIELDS are accepted.
    Unknown fields are silently ignored to prevent injection.
    """
    user_id = current_user.id
    
    # Extract dict from Pydantic model, including extra fields
    updates_dict = updates.model_dump(exclude_unset=True)
    if not updates_dict and updates.model_extra:
        updates_dict = updates.model_extra
    
    # Whitelist filter
    safe_updates = {k: v for k, v in updates_dict.items() if k in ALLOWED_FIELDS}
    if not safe_updates:
        raise HTTPException(status_code=400, detail="No valid settings fields provided.")

    try:
        # Upsert: create row if missing, otherwise merge-update
        supabase_admin.table("user_settings").upsert(
            {"user_id": user_id, **safe_updates},
            on_conflict="user_id"
        ).execute()

        # Fetch and return the complete updated settings
        res = supabase_admin.table("user_settings") \
            .select("*") \
            .eq("user_id", user_id) \
            .maybe_single() \
            .execute()

        if res.data:
            return {**DEFAULT_SETTINGS, **{k: v for k, v in res.data.items()
                                           if k in ALLOWED_FIELDS and v is not None}}

        return {**DEFAULT_SETTINGS, **safe_updates}

    except Exception as e:
        logger.error("Failed to update user settings", user_id=user_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to save settings: {str(e)}")


@router.post("/logout-all-devices")
async def logout_all_devices(current_user: dict = Depends(get_current_user)):
    """
    Increment the user's token_version to invalidate all existing sessions.
    """
    user_id = current_user.id
    try:
        res = supabase_admin.table("user_settings") \
            .select("token_version") \
            .eq("user_id", user_id) \
            .maybe_single() \
            .execute()

        current_version = (res.data or {}).get("token_version", 0) or 0

        supabase_admin.table("user_settings").upsert(
            {"user_id": user_id, "token_version": current_version + 1},
            on_conflict="user_id"
        ).execute()

        return {"message": "All sessions have been terminated. Please log in again."}
    except Exception as e:
        logger.error("Failed to logout all devices", user_id=user_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to terminate sessions.")
