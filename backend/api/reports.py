from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from typing import Optional

from ..core.dependencies import get_current_user
from ..core.exceptions import NotFoundException, ForbiddenException
from ..core.supabase_client import supabase_admin

router = APIRouter(tags=["Reports"])

REPORT_TABLES = {
    "research": "research_reports",
    "competitor": "competitor_reports",
    "business_plan": "business_plans",
    "finance": "financial_reports",
    "marketing": "marketing_reports",
}

@router.get("/projects/{project_id}/reports")
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

@router.get("/projects/{project_id}/reports/{report_type}")
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

@router.get("/projects/{project_id}/agent-logs")
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
    """
    Fetch a completed report. Returns 404 with descriptive status if not ready.
    The detail string encodes the actual status so the frontend can render
    the correct UI (spinner for running, retry button for failed, etc.)
    """
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
        # No record at all — report was never generated
        raise HTTPException(
            status_code=404,
            detail="Report not yet generated. Run AI Analysis first."
        )

    report = result.data[0]
    status = report.get("status", "pending")

    if status == "completed":
        return {"success": True, "data": report}
    elif status == "running":
        progress_info = report.get("raw_data", {}) or {}
        raise HTTPException(
            status_code=202,
            detail={
                "message": "Report is currently being generated. Please wait and refresh.",
                "progress_step": progress_info.get("progress_step", "Running"),
                "progress_percent": progress_info.get("progress_percent", 0)
            }
        )
    elif status == "failed":
        error_detail = report.get("raw_data", {}) or {}
        error_msg = error_detail.get("error", "Unknown error") if isinstance(error_detail, dict) else "Unknown error"
        raise HTTPException(
            status_code=404,
            detail=f"Report generation failed: {error_msg}. Use the Retry button to regenerate."
        )
    else:
        # pending or unknown
        raise HTTPException(
            status_code=404,
            detail="Report has not been generated yet. Run AI Analysis to generate all reports."
        )


@router.get("/projects/{project_id}/reports/{report_type}/markdown")
async def get_report_markdown(
    project_id: str, 
    report_type: str,
    current_user = Depends(get_current_user)
):
    """
    Returns the report data formatted strictly as a Markdown string.
    """
    # Fetch report using the existing _get_report helper
    # We must map the type correctly first
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
        
    result = await _get_report(project_id, REPORT_TABLES[mapped_type], current_user)
    report_data = result["data"]
    raw_json = report_data.get("raw_data", {})
    
    # Simple JSON to Markdown formatter
    lines = []
    
    def walk(obj, depth=0):
        if isinstance(obj, list):
            for item in obj:
                if isinstance(item, (dict, list)):
                    lines.append("")
                    walk(item, depth + 1)
                else:
                    indent = "  " * depth
                    lines.append(f"{indent}- {item}")
        elif isinstance(obj, dict):
            for key, val in obj.items():
                label = str(key).replace("_", " ").title()
                if isinstance(val, (dict, list)):
                    header_level = min(depth + 2, 6)
                    lines.append(f"{'#' * header_level} {label}")
                    walk(val, depth + 1)
                else:
                    lines.append(f"**{label}:** {val}")
        elif obj is not None:
            lines.append(str(obj))
            
    walk(raw_json)
    markdown_content = "\n".join(lines)
    
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(content=markdown_content)


@router.post("/projects/{project_id}/reports/{report_type}/regenerate")
async def regenerate_report(
    project_id: str,
    report_type: str,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user),
):
    """Regenerate a single report section on-demand without touching others."""
    from fastapi import BackgroundTasks as BT
    import structlog
    
    req_logger = structlog.get_logger()
    req_logger.info("Request received: Regenerate Report", project_id=project_id, report_type=report_type, user_id=str(current_user.id))

    # --- Manual Payload Parsing ---
    body_json = {}
    try:
        body_bytes = await request.body()
        if body_bytes:
            body_json = await request.json()
    except Exception as e:
        req_logger.warning("Failed to parse request JSON body on regenerate", error=str(e), project_id=project_id)
        # We don't fail strictly here, just in case, but we log it.
        # If we wanted to fail, we would return 400 with our own details.
        
    req_logger.info(
        "Before validation (Regenerate)",
        project_id=project_id,
        authenticated_user=str(current_user.id),
        incoming_request_body=body_json
    )

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

@router.get("/reports/dashboard")
async def get_reports_dashboard(current_user = Depends(get_current_user)):
    """Fetch all projects and their reports in a single unified query."""
    try:
        try:
            # Try fetching with versioning columns
            query = (
                supabase_admin.table("projects")
                .select(
                    "id, business_name, industry, country, state, budget, status, created_at, "
                    "research_reports(status, raw_data, updated_at, version, previous_versions, provider_used), "
                    "competitor_reports(status, raw_data, updated_at, version, previous_versions, provider_used), "
                    "business_plans(status, raw_data, updated_at, version, previous_versions, provider_used), "
                    "financial_reports(status, raw_data, updated_at, version, previous_versions, provider_used), "
                    "marketing_reports(status, raw_data, updated_at, version, previous_versions, provider_used)"
                )
                .eq("user_id", current_user.id)
                .order("created_at", desc=True)
            )
            res = query.execute()
            return {"success": True, "data": res.data}
        except Exception as query_err:
            # Fallback if versioning migration hasn't been run
            query = (
                supabase_admin.table("projects")
                .select(
                    "id, business_name, industry, country, state, budget, status, created_at, "
                    "research_reports(status, raw_data, updated_at), "
                    "competitor_reports(status, raw_data, updated_at), "
                    "business_plans(status, raw_data, updated_at), "
                    "financial_reports(status, raw_data, updated_at), "
                    "marketing_reports(status, raw_data, updated_at)"
                )
                .eq("user_id", current_user.id)
                .order("created_at", desc=True)
            )
            res = query.execute()
            return {"success": True, "data": res.data}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch reports dashboard: {e}")

