from fastapi import APIRouter, Depends, HTTPException
from ..core.dependencies import get_current_user
from ..core.supabase_client import supabase_admin

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats")
async def get_dashboard_stats(
    current_user = Depends(get_current_user),
):
    try:
        # Fetch counts via count="exact"
        total_res = supabase_admin.table("projects").select("*", count="exact").eq("user_id", current_user.id).execute()
        total_projects = total_res.count or 0

        completed_res = supabase_admin.table("projects").select("*", count="exact").eq("user_id", current_user.id).eq("status", "completed").execute()
        completed = completed_res.count or 0

        partial_res = supabase_admin.table("projects").select("*", count="exact").eq("user_id", current_user.id).eq("status", "partial").execute()
        partial = partial_res.count or 0

        processing_res = supabase_admin.table("projects").select("*", count="exact").eq("user_id", current_user.id).eq("status", "processing").execute()
        processing = processing_res.count or 0

        failed_res = supabase_admin.table("projects").select("*", count="exact").eq("user_id", current_user.id).eq("status", "failed").execute()
        failed = failed_res.count or 0

        unread_res = supabase_admin.table("notifications").select("*", count="exact").eq("user_id", current_user.id).eq("is_read", False).execute()
        unread = unread_res.count or 0

        latest_scores = None
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch dashboard stats: {e}")

    return {
        "success": True,
        "data": {
            "total_projects": total_projects,
            "completed_projects": completed,
            "partial_projects": partial,
            "processing_projects": processing,
            "failed_projects": failed,
            "unread_notifications": unread,
            "latest_scores": latest_scores,
        }
    }

@router.get("/activity")
async def get_activity(
    limit: int = 20,
    current_user = Depends(get_current_user),
):
    limit = max(1, min(limit, 100))
    try:
        # Note: using foreign key embedding syntax. Assuming activity_timeline has foreign key to projects
        result = supabase_admin.table("activity_timeline").select("*, projects(business_name)").eq("user_id", current_user.id).order("created_at", desc=True).limit(limit).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch activity: {e}")
    
    activities = []
    for activity in result.data:
        project_data = activity.get("projects", {})
        biz_name = project_data.get("business_name") if project_data else ""
        
        activities.append({
            "id": activity.get("id"),
            "action": activity.get("action"),
            "details": activity.get("details"),
            "icon": activity.get("icon"),
            "project_id": activity.get("project_id"),
            "project_name": biz_name,
            "created_at": activity.get("created_at"),
        })

    return {"success": True, "data": activities}

@router.get("/notifications")
async def get_notifications(
    limit: int = 20,
    unread_only: bool = False,
    current_user = Depends(get_current_user),
):
    limit = max(1, min(limit, 100))
    try:
        query = supabase_admin.table("notifications").select("*").eq("user_id", current_user.id)
        if unread_only:
            query = query.eq("is_read", False)
        
        result = query.order("created_at", desc=True).limit(limit).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch notifications: {e}")

    data = []
    for n in result.data:
        data.append({
            "id": n.get("id"),
            "title": n.get("title"),
            "message": n.get("message"),
            "type": n.get("notification_type"),
            "is_read": n.get("is_read"),
            "project_id": n.get("project_id"),
            "created_at": n.get("created_at"),
        })

    return {"success": True, "data": data}

@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user = Depends(get_current_user),
):
    try:
        supabase_admin.table("notifications").update({"is_read": True}).eq("id", notification_id).eq("user_id", current_user.id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark notification as read: {e}")
    return {"success": True, "message": "Marked as read"}

@router.put("/notifications/read-all")
async def mark_all_read(
    current_user = Depends(get_current_user),
):
    try:
        res = supabase_admin.table("notifications").update({"is_read": True}).eq("user_id", current_user.id).eq("is_read", False).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark notifications as read: {e}")
    count = len(res.data) if res.data else 0
    return {"success": True, "message": f"Marked {count} notifications as read"}
