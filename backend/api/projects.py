from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel

from ..core.dependencies import get_current_user
from ..core.exceptions import NotFoundException, ForbiddenException
from ..core.supabase_client import supabase_client

router = APIRouter(prefix="/projects", tags=["Projects"])

class ProjectCreate(BaseModel):
    business_name: str
    business_idea: str
    industry: str
    country: str
    state: Optional[str] = None
    target_audience: Optional[str] = None
    budget: Optional[float] = None
    budget_currency: str = "INR"
    goals: Optional[str] = None
    business_stage: str = "idea"
    risk_appetite: str = "medium"
    timeline: Optional[str] = None

class ProjectUpdate(BaseModel):
    business_name: Optional[str] = None
    business_idea: Optional[str] = None
    industry: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    target_audience: Optional[str] = None
    budget: Optional[float] = None
    budget_currency: Optional[str] = None
    goals: Optional[str] = None
    business_stage: Optional[str] = None
    risk_appetite: Optional[str] = None
    timeline: Optional[str] = None

@router.get("")
async def list_projects(
    page: int = 1,
    limit: int = 20,
    status: Optional[str] = None,
    current_user = Depends(get_current_user),
):
    try:
        query = supabase_client.table("projects").select("*", count="exact").eq("user_id", current_user.id)
        if status:
            query = query.eq("status", status)
        
        # Supabase offset/limit
        res = query.order("created_at", desc=True).range((page - 1) * limit, page * limit - 1).execute()
        
        projects = res.data
        total = res.count or 0
        return {
            "success": True,
            "data": projects,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", status_code=201)
async def create_project(
    request: ProjectCreate,
    current_user = Depends(get_current_user),
):
    try:
        insert_data = request.model_dump(exclude_none=True)
        insert_data["user_id"] = current_user.id
        insert_data["status"] = "draft"
        insert_data["progress_percent"] = 0
        
        res = supabase_client.table("projects").insert(insert_data).execute()
        if not res.data:
            raise Exception("Failed to create project")
        project = res.data[0]

        # Log activity
        supabase_client.table("activity_timeline").insert({
            "project_id": project["id"],
            "user_id": current_user.id,
            "action": "Project Created",
            "details": {"business_name": project.get("business_name")},
            "icon": "plus-circle"
        }).execute()

        return {"success": True, "data": project, "message": "Project created successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{project_id}")
async def get_project(
    project_id: str,
    current_user = Depends(get_current_user),
):
    res = supabase_client.table("projects").select("*").eq("id", project_id).execute()
    if not res.data:
        raise NotFoundException("Project", project_id)
    project = res.data[0]

    # Verify ownership or admin
    role = current_user.user_metadata.get("role", "user") if current_user.user_metadata else "user"
    if str(project.get("user_id")) != str(current_user.id) and role != "admin":
        raise ForbiddenException()

    return {"success": True, "data": project}

@router.put("/{project_id}")
async def update_project(
    project_id: str,
    request: ProjectUpdate,
    current_user = Depends(get_current_user),
):
    res = supabase_client.table("projects").select("*").eq("id", project_id).execute()
    if not res.data:
        raise NotFoundException("Project", project_id)
    project = res.data[0]

    if str(project.get("user_id")) != str(current_user.id):
        raise ForbiddenException()

    update_data = request.model_dump(exclude_none=True)
    if update_data:
        res = supabase_client.table("projects").update(update_data).eq("id", project_id).execute()
        if res.data:
            project = res.data[0]

    return {"success": True, "data": project, "message": "Project updated"}

@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user = Depends(get_current_user),
):
    res = supabase_client.table("projects").select("user_id").eq("id", project_id).execute()
    if not res.data:
        raise NotFoundException("Project", project_id)
    if str(res.data[0].get("user_id")) != str(current_user.id):
        raise ForbiddenException()

    supabase_client.table("projects").delete().eq("id", project_id).execute()
    return {"success": True, "message": "Project deleted successfully"}

@router.post("/{project_id}/run")
async def run_agents(
    project_id: str,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user),
):
    """Trigger the AI agent pipeline for a project"""
    res = supabase_client.table("projects").select("*").eq("id", project_id).execute()
    if not res.data:
        raise NotFoundException("Project", project_id)
    project = res.data[0]

    if str(project.get("user_id")) != str(current_user.id):
        raise ForbiddenException()

    if project.get("status") == "processing":
        raise HTTPException(status_code=400, detail="Project is already being processed")

    # Note: orchestrator.run() will set status to 'processing' itself
    # Schedule async background task — FastAPI handles async background tasks natively
    background_tasks.add_task(_run_agent_pipeline, project)

    return {
        "success": True,
        "message": "AI analysis started. This will take 3-5 minutes.",
        "project_id": project_id,
    }

@router.get("/{project_id}/status")
async def get_project_status(
    project_id: str,
    current_user = Depends(get_current_user),
):
    res = supabase_client.table("projects").select("status, progress_percent, current_agent, error_message, completed_at").eq("id", project_id).execute()
    if not res.data:
        raise NotFoundException("Project", project_id)

    return {
        "success": True,
        "data": res.data[0],
    }

async def _run_agent_pipeline(project: dict):
    """Async background task to run the agent pipeline.
    FastAPI BackgroundTasks fully supports async functions.
    """
    import structlog
    bg_logger = structlog.get_logger()
    from ..agents.orchestrator import AgentOrchestrator

    project_id = project.get("id")
    bg_logger.info("Background pipeline starting", project_id=project_id)

    orchestrator = AgentOrchestrator(supabase_client)
    try:
        await orchestrator.run(project)
        bg_logger.info("Background pipeline finished", project_id=project_id)
    except Exception as e:
        bg_logger.error("Background pipeline crashed", project_id=project_id, error=str(e))
        try:
            supabase_client.table("projects").update({
                "status": "failed",
                "error_message": f"Pipeline error: {str(e)[:500]}",
                "current_agent": None,
            }).eq("id", project_id).execute()
        except Exception:
            pass  # Don't let error reporting crash the server
