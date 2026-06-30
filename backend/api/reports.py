from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Optional

from ..core.dependencies import get_current_user
from ..core.exceptions import NotFoundException, ForbiddenException
from ..core.supabase_client import supabase_admin

router = APIRouter(prefix="/projects", tags=["Reports"])

REPORT_TABLES = {
    "research": "research_reports",
    "competitor": "competitor_reports",
    "business_plan": "business_plans",
    "finance": "financial_reports",
    "marketing": "marketing_reports",
}

@router.get("/{project_id}/reports")
async def get_all_reports(
    project_id: str,
    current_user = Depends(get_current_user),
):
    """Get all reports for a project with their completion status"""
    try:
        res = supabase_admin.table("projects").select("user_id").eq("id", project_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch project: {e}")
    if not res.data:
        raise NotFoundException("Project", project_id)
        
    project = res.data[0]
    role = current_user.user_metadata.get("role", "user") if current_user.user_metadata else "user"
    if str(project.get("user_id")) != str(current_user.id) and role != "admin":
        raise ForbiddenException()

    reports = {}
    for key, table_name in REPORT_TABLES.items():
        try:
            r = supabase_admin.table(table_name).select("*").eq("project_id", project_id).execute()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch {key} report: {e}")
        report = r.data[0] if r.data else None
        
        status = report.get("status", "pending") if report else "pending"
        reports[key] = {
            "available": report is not None and status == "completed",
            "status": status,
            "data": report,
        }

    return {"success": True, "data": reports}

@router.get("/{project_id}/reports/{report_type}")
async def get_specific_report(
    project_id: str, 
    report_type: str,
    current_user = Depends(get_current_user)
):
    # Mapping for the specific endpoints like business-plan
    type_mapping = {
        "research": "research",
        "competitor": "competitor",
        "business-plan": "business_plan",
        "business_plan": "business_plan",
        "finance": "finance",
        "financial": "finance",
        "marketing": "marketing",
    }
    
    mapped_type = type_mapping.get(report_type)
    if not mapped_type or mapped_type not in REPORT_TABLES:
        raise NotFoundException("Report Type", report_type)
        
    return await _get_report(project_id, REPORT_TABLES[mapped_type], current_user)

@router.get("/{project_id}/agent-logs")
async def get_agent_logs(project_id: str, current_user = Depends(get_current_user)):
    try:
        res = supabase_admin.table("projects").select("user_id").eq("id", project_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch project: {e}")
    if not res.data:
        raise NotFoundException("Project", project_id)
        
    project = res.data[0]
    role = current_user.user_metadata.get("role", "user") if current_user.user_metadata else "user"
    if str(project.get("user_id")) != str(current_user.id) and role != "admin":
        raise ForbiddenException()
        
    try:
        result = supabase_admin.table("agent_logs").select("*").eq("project_id", project_id).order("created_at").execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch agent logs: {e}")
    return {"success": True, "data": result.data}

async def _get_report(project_id: str, table_name: str, current_user):
    # Verify project ownership
    try:
        res = supabase_admin.table("projects").select("user_id").eq("id", project_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch project: {e}")
    if not res.data:
        raise NotFoundException("Project", project_id)
        
    project = res.data[0]
    role = current_user.user_metadata.get("role", "user") if current_user.user_metadata else "user"
    if str(project.get("user_id")) != str(current_user.id) and role != "admin":
        raise ForbiddenException()

    try:
        result = supabase_admin.table(table_name).select("*").eq("project_id", project_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch report: {e}")
        
    if not result.data:
        raise HTTPException(status_code=404, detail="Report not yet generated")
        
    report = result.data[0]
    if report.get("status") != "completed":
        raise HTTPException(status_code=404, detail="Report is not completed")

    return {"success": True, "data": report}


@router.post("/{project_id}/reports/{report_type}/regenerate")
async def regenerate_report(
    project_id: str,
    report_type: str,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user),
):
    """Regenerate a single report section on-demand without touching others."""
    from fastapi import BackgroundTasks as BT

    type_mapping = {
        "research": "research",
        "competitor": "competitor",
        "business-plan": "business_plan",
        "business_plan": "business_plan",
        "finance": "finance",
        "financial": "finance",
        "marketing": "marketing",
    }
    section_key = type_mapping.get(report_type)
    if not section_key:
        raise NotFoundException("Report Type", report_type)

    # Verify project ownership
    try:
        res = supabase_admin.table("projects").select("*").eq("id", project_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch project: {e}")
    if not res.data:
        raise NotFoundException("Project", project_id)

    project = res.data[0]
    role = current_user.user_metadata.get("role", "user") if current_user.user_metadata else "user"
    if str(project.get("user_id")) != str(current_user.id) and role != "admin":
        raise ForbiddenException()

    # Run in background so the HTTP response returns immediately
    background_tasks.add_task(_run_single_regeneration, project, section_key)

    return {
        "success": True,
        "message": f"Regenerating {section_key} report in background.",
        "section": section_key,
    }


async def _run_single_regeneration(project: dict, section_key: str):
    """Background task: regenerate one section and save it."""
    import structlog
    bg_logger = structlog.get_logger()
    from ..agents.orchestrator import AgentOrchestrator

    project_id = project.get("id")
    bg_logger.info("Single regeneration starting", project_id=project_id, section=section_key)
    orchestrator = AgentOrchestrator(supabase_admin)
    try:
        await orchestrator.regenerate_section(project, section_key)
        bg_logger.info("Single regeneration complete", project_id=project_id, section=section_key)
    except Exception as e:
        bg_logger.error("Single regeneration failed", project_id=project_id, section=section_key, error=str(e))

