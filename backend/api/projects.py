import traceback

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field

from ..core.dependencies import get_current_user
from ..core.exceptions import NotFoundException, ForbiddenException
from ..core.supabase_client import supabase_admin

router = APIRouter(prefix="/projects", tags=["Projects"])

class ProjectCreate(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=100)
    business_idea: str = Field(..., min_length=10)
    industry: str = Field(..., min_length=2)
    country: str = Field(..., min_length=2)
    state: Optional[str] = None
    target_audience: Optional[str] = None
    budget: Optional[float] = Field(None, gt=0)
    budget_currency: str = "INR"
    goals: Optional[str] = None
    business_stage: str = Field("idea", pattern="^(idea|validation|early_stage|growth|scaling)$")
    risk_appetite: str = Field("medium", pattern="^(low|medium|high)$")
    timeline: Optional[str] = Field(None, min_length=2)

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
        query = supabase_admin.table("projects").select("*", count="exact").eq("user_id", current_user.id)
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
        
        res = supabase_admin.table("projects").insert(insert_data).execute()
        if not res.data:
            raise Exception("Failed to create project")
        project = res.data[0]

        # Log activity
        supabase_admin.table("activity_timeline").insert({
            "project_id": project["id"],
            "user_id": current_user.id,
            "action": "Project Created",
            "details": {"business_name": project.get("business_name")},
            "icon": "plus-circle"
        }).execute()

        return {"success": True, "data": project, "message": "Project created successfully"}
    except Exception as e:
        err_msg = str(e)
        detail = "Failed to create project."
        
        if "violates row-level security policy" in err_msg:
            detail = "Permission denied: Your account does not have authorization to create projects."
        elif "does not exist" in err_msg:
            detail = "Database configuration error: A required column or table is missing."
        else:
            detail = f"Database insertion failed: {err_msg}"
            
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=detail)

@router.get("/{project_id}")
async def get_project(
    project_id: str,
    current_user = Depends(get_current_user),
):
    try:
        res = supabase_admin.table("projects").select("*").eq("id", project_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch project: {e}")
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
    try:
        res = supabase_admin.table("projects").select("*").eq("id", project_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch project: {e}")
    if not res.data:
        raise NotFoundException("Project", project_id)
    project = res.data[0]

    if str(project.get("user_id")) != str(current_user.id):
        raise ForbiddenException()

    update_data = request.model_dump(exclude_none=True)
    if update_data:
        try:
            res = supabase_admin.table("projects").update(update_data).eq("id", project_id).execute()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to update project: {e}")
        if res.data:
            project = res.data[0]

    return {"success": True, "data": project, "message": "Project updated"}

@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user = Depends(get_current_user),
):
    try:
        res = supabase_admin.table("projects").select("user_id").eq("id", project_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch project: {e}")
    if not res.data:
        raise NotFoundException("Project", project_id)
    if str(res.data[0].get("user_id")) != str(current_user.id):
        raise ForbiddenException()

    try:
        supabase_admin.table("projects").delete().eq("id", project_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete project: {e}")
    return {"success": True, "message": "Project deleted successfully"}

@router.post("/{project_id}/run")
async def run_agents(
    project_id: str,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user),
):
    """Trigger the AI agent pipeline for a project"""
    import uuid
    import structlog
    import json
    
    req_logger = structlog.get_logger()
    req_logger.info("Request received: Run AI Analysis", project_id=project_id, user_id=str(current_user.id))

    try:
        try:
            res = supabase_admin.table("projects").select("*").eq("id", project_id).execute()
        except Exception as db_err:
            req_logger.error("Database connection failed while fetching project", error=str(db_err))
            return JSONResponse(status_code=500, content={"success": False, "error": "Database connection failed", "details": str(db_err)[:200]})
            
        if not res.data:
            raise NotFoundException("Project", project_id)
        project = res.data[0]
        
        req_logger.info("Project loaded successfully", project_id=project_id)

        if str(project.get("user_id")) != str(current_user.id):
            raise ForbiddenException()

        if project.get("status") == "processing":
            raise HTTPException(status_code=400, detail="Project is already being processed")

        job_id = str(uuid.uuid4())
        
        # Ensure diagnostics is a dict
        diagnostics = project.get("ai_diagnostics")
        if isinstance(diagnostics, str):
            try:
                diagnostics = json.loads(diagnostics)
            except Exception:
                diagnostics = {}
        elif not isinstance(diagnostics, dict):
            diagnostics = {}
            
        diagnostics["current_job_id"] = job_id
        
        # Attempt to update ai_diagnostics and status
        try:
            supabase_admin.table("projects").update({
                "ai_diagnostics": diagnostics,
                "status": "processing"
            }).eq("id", project_id).execute()
            req_logger.info("Updated project status to processing with diagnostics", project_id=project_id)
        except Exception as update_err:
            req_logger.warning("Failed to update ai_diagnostics (possibly missing column), falling back to status only", error=str(update_err))
            try:
                supabase_admin.table("projects").update({
                    "status": "processing"
                }).eq("id", project_id).execute()
                req_logger.info("Updated project status to processing (fallback successful)", project_id=project_id)
            except Exception as fallback_err:
                req_logger.error("Failed to update project status in fallback", error=str(fallback_err))
                return JSONResponse(status_code=500, content={"success": False, "error": "Database write failed", "details": str(fallback_err)[:200]})

        # Schedule async background task
        background_tasks.add_task(_run_agent_pipeline, project, job_id)

        return {
            "success": True,
            "message": "AI analysis started. Agents are running sequentially.",
            "project_id": project_id,
            "job_id": job_id,
        }
    except HTTPException:
        raise
    except Exception as e:
        req_logger.error("Failed to start analysis", error=str(e), exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "agent": "Orchestrator",
                "error": f"Failed to start analysis: {str(e)[:200]}"
            }
        )

@router.get("/{project_id}/status")
async def get_project_status(
    project_id: str,
    current_user = Depends(get_current_user),
):
    res = supabase_admin.table("projects").select("*").eq("id", project_id).eq("user_id", str(current_user.id)).execute()
    if not res.data:
        raise NotFoundException("Project", project_id)
        
    project = res.data[0]
    
    # Compute if data has been modified since last successful run
    is_modified = False
    from ..agents.orchestrator import AgentOrchestrator
    orchestrator = AgentOrchestrator(supabase_admin)
    current_hash = orchestrator._compute_input_hash(project)
    
    if project.get("input_hash") and project.get("input_hash") != current_hash:
        is_modified = True

    return {
        "success": True,
        "data": {
            "status": project.get("status"),
            "progress_percent": project.get("progress_percent"),
            "current_agent": project.get("current_agent"),
            "error_message": project.get("error_message"),
            "completed_at": project.get("completed_at"),
            "user_id": project.get("user_id"),
            "is_modified": is_modified,
            "job_id": (project.get("ai_diagnostics") or {}).get("current_job_id")
        },
    }

async def _run_agent_pipeline(project: dict, job_id: str):
    """
    Async background task for the AI agent pipeline.
    Uses supabase_admin (service role) to bypass RLS for server-side writes.
    """
    import structlog
    bg_logger = structlog.get_logger()
    from ..agents.orchestrator import AgentOrchestrator

    project_id = project.get("id")
    bg_logger.info("Background pipeline starting", project_id=project_id, job_id=job_id)

    orchestrator = AgentOrchestrator(supabase_admin)
    try:
        await orchestrator.run(project, job_id=job_id)
        bg_logger.info("Background pipeline finished", project_id=project_id, job_id=job_id)
    except Exception as e:
        bg_logger.error("Background pipeline crashed", project_id=project_id, job_id=job_id, error=str(e))
        try:
            supabase_admin.table("projects").update({
                "status": "failed",
                "error_message": f"Pipeline error: {str(e)[:500]}",
                "current_agent": None,
            }).eq("id", project_id).execute()
        except Exception:
            pass


