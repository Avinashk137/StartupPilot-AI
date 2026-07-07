import traceback

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ValidationError

from ..core.dependencies import get_current_user
from ..core.exceptions import NotFoundException, ForbiddenException
from ..core.supabase_client import supabase_admin

router = APIRouter(prefix="/projects", tags=["Projects"])

class RunAIRequest(BaseModel):
    resume_mode: bool = False
    retry_mode: bool = False
    requested_reports: Optional[List[str]] = None

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
        insert_data["country"] = "India"
        insert_data["budget_currency"] = "INR"
        
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
        
        if hasattr(e, 'code') and hasattr(e, 'message'):
            # Supabase APIError
            detail = f"Database error ({e.code}): {e.message}"
        elif "violates row-level security policy" in err_msg:
            detail = "Permission denied: Your account does not have authorization to create projects."
        elif "does not exist" in err_msg:
            detail = "Database configuration error: A required column or table is missing."
        else:
            detail = f"Project creation failed: {err_msg}"
            
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
        if "country" in update_data:
            update_data["country"] = "India"
        if "budget_currency" in update_data:
            update_data["budget_currency"] = "INR"
            
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
    request: Request,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user),
):
    """Trigger the AI agent pipeline for a project.
    
    Modes:
      - Normal: runs all missing agents
      - retry_mode=True: runs ONLY agents that previously failed (smart retry)
      - resume_mode=True: runs ONLY agents that are not yet completed (smart resume)
    """
    import uuid
    import structlog
    import json
    from datetime import datetime, timezone
    
    req_logger = structlog.get_logger()
    req_logger.info("Request received: Run AI Analysis", project_id=project_id, user_id=str(current_user.id))

    # --- 1. Parse body ---
    body_json = {}
    try:
        body_bytes = await request.body()
        if body_bytes:
            body_json = await request.json()
    except Exception as e:
        return JSONResponse(status_code=400, content={"success": False, "error": "Invalid JSON payload", "details": str(e)})

    try:
        payload = RunAIRequest(**body_json)
    except Exception as ve:
        return JSONResponse(status_code=400, content={"success": False, "error": "Validation failed", "details": str(ve)})

    # --- 2. Load project ---
    try:
        res = supabase_admin.table("projects").select("*").eq("id", project_id).execute()
    except Exception as db_err:
        return JSONResponse(status_code=500, content={"success": False, "error": "Database connection failed", "details": str(db_err)[:200]})
        
    if not res.data:
        raise NotFoundException("Project", project_id)
    project = res.data[0]

    if str(project.get("user_id")) != str(current_user.id):
        raise ForbiddenException()

    # --- 3. Stuck-project guard ---
    # If project has been in 'processing' for >3 minutes, force-reset it
    if project.get("status") == "processing":
        heartbeat_str = project.get("heartbeat") or project.get("updated_at")
        is_stuck = False
        if heartbeat_str:
            try:
                if heartbeat_str.endswith("Z"):
                    heartbeat_str = heartbeat_str[:-1] + "+00:00"
                last_beat = datetime.fromisoformat(heartbeat_str)
                if last_beat.tzinfo is None:
                    from datetime import timezone as tz
                    last_beat = last_beat.replace(tzinfo=tz.utc)
                from datetime import timezone as tz
                seconds_stalled = (datetime.now(tz.utc) - last_beat).total_seconds()
                if seconds_stalled > 180:  # 3 minutes
                    is_stuck = True
                    req_logger.warning("Stuck project detected, force-resetting", project_id=project_id, seconds=round(seconds_stalled))
            except Exception:
                pass
        
        if not is_stuck:
            return JSONResponse(status_code=409, content={"success": False, "error": "Project is already being processed"})
        
        # Force-reset stuck project so the new run can proceed
        supabase_admin.table("projects").update({
            "status": "partial",
            "current_agent": None,
            "error_message": "Previous run was stalled and has been reset. Retrying.",
        }).eq("id", project_id).execute()
        project["status"] = "partial"

    job_id = str(uuid.uuid4())

    # --- 4. Determine target sections based on mode ---
    from ..agents.orchestrator import SECTION_KEYS, TABLE_MAP
    
    target_sections = None  # None = normal mode (orchestrator decides)
    
    if payload.retry_mode:
        # Smart retry: only re-run agents that explicitly failed
        failed_sections = []
        for sk, table in TABLE_MAP.items():
            try:
                r = supabase_admin.table(table).select("status").eq("project_id", project_id).execute()
                if not r.data or r.data[0].get("status") in ("failed", "pending"):
                    failed_sections.append(sk)
            except Exception:
                failed_sections.append(sk)
        target_sections = failed_sections
        req_logger.info("Retry mode: targeting failed sections", project_id=project_id, sections=target_sections)
        
        if not target_sections:
            return JSONResponse(status_code=200, content={"success": True, "message": "All reports are already completed. Nothing to retry."})

    elif payload.resume_mode:
        # Smart resume: only run incomplete (non-completed) agents
        incomplete_sections = []
        for sk, table in TABLE_MAP.items():
            try:
                r = supabase_admin.table(table).select("status").eq("project_id", project_id).execute()
                if not r.data or r.data[0].get("status") != "completed":
                    incomplete_sections.append(sk)
            except Exception:
                incomplete_sections.append(sk)
        target_sections = incomplete_sections
        req_logger.info("Resume mode: targeting incomplete sections", project_id=project_id, sections=target_sections)
        
        if not target_sections:
            return JSONResponse(status_code=200, content={"success": True, "message": "All reports are already completed. Nothing to resume."})

    elif payload.requested_reports:
        # Explicit list of sections to run
        valid = [s for s in payload.requested_reports if s in SECTION_KEYS]
        target_sections = valid if valid else None

    # --- 5. Mark project as processing ---
    diagnostics = project.get("ai_diagnostics") or {}
    if isinstance(diagnostics, str):
        try:
            diagnostics = json.loads(diagnostics)
        except Exception:
            diagnostics = {}
    diagnostics["current_job_id"] = job_id
    
    try:
        supabase_admin.table("projects").update({
            "ai_diagnostics": diagnostics,
            "status": "processing",
            "heartbeat": datetime.now(timezone.utc).isoformat(),
        }).eq("id", project_id).execute()
    except Exception as update_err:
        req_logger.warning("Failed to update with diagnostics, trying minimal", error=str(update_err))
        supabase_admin.table("projects").update({"status": "processing"}).eq("id", project_id).execute()

    # --- 6. Launch background pipeline ---
    import asyncio
    asyncio.create_task(_run_agent_pipeline(project, job_id, target_sections))

    mode_label = "retry" if payload.retry_mode else ("resume" if payload.resume_mode else "full")
    return {
        "success": True,
        "message": f"AI analysis started ({mode_label} mode). Agents are running.",
        "project_id": project_id,
        "job_id": job_id,
        "mode": mode_label,
        "target_sections": target_sections,
    }

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
            "heartbeat": project.get("heartbeat"),
            "error_message": project.get("error_message"),
            "completed_at": project.get("completed_at"),
            "user_id": project.get("user_id"),
            "is_modified": is_modified,
            "job_id": (project.get("ai_diagnostics") or {}).get("current_job_id")
        },
    }

async def _run_agent_pipeline(project: dict, job_id: str, target_sections=None):
    """
    Async background task for the AI agent pipeline.
    Uses supabase_admin (service role) to bypass RLS for server-side writes.
    target_sections: if provided, only those sections are run (retry/resume mode).
    """
    import structlog
    bg_logger = structlog.get_logger()
    from ..agents.orchestrator import AgentOrchestrator

    project_id = project.get("id")
    bg_logger.info("Background pipeline starting", project_id=project_id, job_id=job_id, target_sections=target_sections)

    orchestrator = AgentOrchestrator(supabase_admin)
    try:
        await orchestrator.run(project, job_id=job_id, target_sections=target_sections)
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


