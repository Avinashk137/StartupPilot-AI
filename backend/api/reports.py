from fastapi import APIRouter, Depends, HTTPException
from typing import Optional

from ..core.dependencies import get_current_user
from ..core.exceptions import NotFoundException, ForbiddenException
from ..core.supabase_client import supabase_client

router = APIRouter(prefix="/projects", tags=["Reports"])

REPORT_TABLES = {
    "research": "research_reports",
    "competitor": "competitor_reports",
    "business_plan": "business_plans",
    "finance": "financial_reports",
    "marketing": "marketing_reports",
    "advertisement": "advertisements",
    "analytics": "analytics_reports",
}

@router.get("/{project_id}/reports")
async def get_all_reports(
    project_id: str,
    current_user = Depends(get_current_user),
):
    """Get all reports for a project with their completion status"""
    res = supabase_client.table("projects").select("user_id").eq("id", project_id).execute()
    if not res.data:
        raise NotFoundException("Project", project_id)
        
    project = res.data[0]
    role = current_user.user_metadata.get("role", "user") if current_user.user_metadata else "user"
    if str(project.get("user_id")) != str(current_user.id) and role != "admin":
        raise ForbiddenException()

    reports = {}
    for key, table_name in REPORT_TABLES.items():
        r = supabase_client.table(table_name).select("*").eq("project_id", project_id).execute()
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
        "finance": "finance",
        "marketing": "marketing",
        "advertisement": "advertisement",
        "analytics": "analytics",
    }
    
    mapped_type = type_mapping.get(report_type)
    if not mapped_type or mapped_type not in REPORT_TABLES:
        raise NotFoundException("Report Type", report_type)
        
    return await _get_report(project_id, REPORT_TABLES[mapped_type], current_user)

@router.get("/{project_id}/agent-logs")
async def get_agent_logs(project_id: str, current_user = Depends(get_current_user)):
    res = supabase_client.table("projects").select("user_id").eq("id", project_id).execute()
    if not res.data:
        raise NotFoundException("Project", project_id)
        
    project = res.data[0]
    role = current_user.user_metadata.get("role", "user") if current_user.user_metadata else "user"
    if str(project.get("user_id")) != str(current_user.id) and role != "admin":
        raise ForbiddenException()
        
    result = supabase_client.table("agent_logs").select("*").eq("project_id", project_id).order("created_at").execute()
    return {"success": True, "data": result.data}

async def _get_report(project_id: str, table_name: str, current_user):
    # Verify project ownership
    res = supabase_client.table("projects").select("user_id").eq("id", project_id).execute()
    if not res.data:
        raise NotFoundException("Project", project_id)
        
    project = res.data[0]
    role = current_user.user_metadata.get("role", "user") if current_user.user_metadata else "user"
    if str(project.get("user_id")) != str(current_user.id) and role != "admin":
        raise ForbiddenException()

    result = supabase_client.table(table_name).select("*").eq("project_id", project_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Report not yet generated")

    return {"success": True, "data": result.data[0]}
