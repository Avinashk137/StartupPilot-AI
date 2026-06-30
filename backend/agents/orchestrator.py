"""
orchestrator.py — Single-Call AI Orchestrator with Smart Cache

Architecture:
  1. Hash project inputs → check Supabase for cache hit
  2. ONE master AI call → all 7 sections in a single response
  3. Validate each section → regenerate missing sections individually
  4. Save each section to Supabase independently
  5. Always show specific, actionable error messages
"""
import asyncio
import hashlib
import json
import traceback
from typing import Optional, Callable, Dict, Any, List
from datetime import datetime, timezone
import structlog

from .agents import MasterPromptBuilder, SECTION_KEYS, SECTION_REQUIRED_KEYS, build_context_summary
from ..services.ai.ai_service import ai_service
from ..core.exceptions import AIServiceException

logger = structlog.get_logger()
ProgressCallback = Optional[Callable[[str, int, str], None]]

# Progress percentages per section (cumulative)
SECTION_PROGRESS = {
    "research":      20,
    "competitor":    40,
    "business_plan": 60,
    "finance":       80,
    "marketing":     100,
}

# Human-readable section names for notifications
SECTION_DISPLAY = {
    "research":      "Market Research",
    "competitor":    "Competitor Analysis",
    "business_plan": "Business Plan",
    "finance":       "Financial Report",
    "marketing":     "Marketing Strategy",
}

TABLE_MAP = {
    "research":      "research_reports",
    "competitor":    "competitor_reports",
    "business_plan": "business_plans",
    "finance":       "financial_reports",
    "marketing":     "marketing_reports",
}

MAX_SECTION_RETRIES = 1


class AgentOrchestrator:
    """
    Single-call AI orchestrator:
    - Checks cache before running
    - Makes ONE master AI call for all 5 sections
    - Validates and regenerates missing sections individually
    - Saves each section independently to Supabase
    """

    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.prompt_builder = MasterPromptBuilder()
        self.diagnostics = {}

    # ── Public API ────────────────────────────────────────────

    async def regenerate_section(self, project: dict, section_key: str) -> dict:
        """
        Public entry-point: regenerate one individual section on-demand.
        Used by the /reports/{type}/regenerate API endpoint.
        - Validates section_key
        - Generates a fresh AI response for just that section
        - Saves to the correct Supabase table
        - Returns the saved report record
        """
        if section_key not in SECTION_KEYS:
            raise ValueError(f"Unknown section: {section_key}. Valid: {SECTION_KEYS}")

        project_id = project["id"]
        display = SECTION_DISPLAY[section_key]
        logger.info(f"Regenerating section on-demand: {section_key}", project_id=project_id)

        section_data, tokens = await self._generate_single_section(section_key, project, project_id)

        if not section_data or "error" in section_data:
            error_msg = section_data.get("error", "Unknown error") if section_data else "Empty response"
            raise AIServiceException(error_msg)

        await self._save_report(project_id, section_key, section_data)
        await self._log_agent(project_id, section_key, "completed", tokens=tokens)

        logger.info(f"Section regenerated and saved: {section_key}", project_id=project_id)
        return section_data

    async def run(
        self,
        project: dict,
        job_id: str,
        on_progress: ProgressCallback = None,
    ) -> Dict[str, Any]:
        """
        Sequential AI Orchestrator:
        - Checks cache before running
        - Executes agents one-by-one in sequence
        - Saves each section independently to Supabase immediately after generation
        - Retries on failure, halting the job if a section permanently fails
        """
        project_id = project["id"]
        user_id = project["user_id"]
        business_name = project.get("business_name", "your business")

        try:
            # ── 1. Compute input hash ──────────────────────────
            input_hash = self._compute_input_hash(project)

            # ── 2. Check cache / Resume ─────────────────────────────────
            completed_sections = await self._get_completed_sections(project_id, input_hash)
            missing_sections = [s for s in SECTION_KEYS if s not in completed_sections]

            if not missing_sections:
                await self._create_notification(
                    user_id=user_id, project_id=project_id,
                    title="Reports Loaded from Cache ⚡",
                    message=f"No changes detected for '{business_name}'. Your existing reports are still valid.",
                    notification_type="info",
                )
                logger.info("Cache hit — skipping AI call", project_id=project_id)
                self._update_project(project_id, {
                    "status": "completed",
                    "progress_percent": 100,
                    "current_agent": None,
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                })
                return {"cached": True}

            # ── 3. Mark as processing ──────────────────────────
            self._update_project(project_id, {
                "status": "processing",
                "progress_percent": 0,
                "current_agent": missing_sections[0] if missing_sections else None,
                "error_message": None,
            })

            if completed_sections:
                await self._create_notification(
                    user_id=user_id, project_id=project_id,
                    title="Resuming Analysis 🔄",
                    message=f"Resuming analysis for '{business_name}'. {len(completed_sections)}/5 sections already complete.",
                    notification_type="info",
                )
            else:
                await self._create_notification(
                    user_id=user_id, project_id=project_id,
                    title="AI Analysis Started 🚀",
                    message=f"5 AI agents are now sequentially analyzing '{business_name}'.",
                    notification_type="info",
                )
            await self._create_activity(
                project_id=project_id, user_id=user_id,
                action="AI Analysis Started",
                details={"sections": 5, "input_hash": input_hash, "job_id": job_id},
                icon="play-circle",
            )

            # ── 4. Sequential Execution Loop ──────────────────────
            results = {}
            failed_sections: List[str] = []
            tokens_total = 0

            for section_key in SECTION_KEYS:
                pct = SECTION_PROGRESS[section_key]
                display = SECTION_DISPLAY[section_key]

                self._update_project(project_id, {
                    "current_agent": section_key,
                    "progress_percent": max(0, pct - 10),
                })
                if on_progress:
                    on_progress(section_key, pct - 10, "running")

                if section_key in completed_sections:
                    results[section_key] = {"cached": True}
                    self._update_project(project_id, {"progress_percent": pct})
                    if on_progress:
                        on_progress(section_key, pct, "completed")
                    continue
                    
                # Execute single agent
                logger.info(f"{display} Agent started", project_id=project_id, job_id=job_id)
                await self._save_report_status(project_id, section_key, "running")
                try:
                    section_data, section_tokens = await self._generate_single_section(section_key, project, project_id)
                    tokens_total += section_tokens
                except Exception as e:
                    logger.error(f"{display} Agent crashed", error=str(e), project_id=project_id)
                    section_data = {"error": f"Agent crashed: {str(e)[:200]}"}

                if not section_data or "error" in section_data:
                    # Section failed -> Mark as failed but CONTINUE job
                    error_msg = section_data.get("error", "Unknown error") if section_data else "Empty response"
                    failed_sections.append(section_key)
                    results[section_key] = {"error": error_msg}

                    await self._log_agent(project_id, section_key, "failed", error_msg)
                    await self._save_report_status(project_id, section_key, "failed", {"error": error_msg})
                    await self._create_notification(
                        user_id=user_id, project_id=project_id,
                        title=f"{display} Failed ⚠️",
                        message=f"Could not generate {display}: {error_msg}",
                        notification_type="error",
                    )
                    logger.warning(f"{display} Agent failed", project_id=project_id, error=error_msg)
                    continue # Continue with the remaining agents instead of break
                else:
                    # Section complete -> Save to Supabase immediately
                    logger.info(f"{display} Agent completed", project_id=project_id)
                    try:
                        logger.info(f"Saving report for {display}", project_id=project_id)
                        await self._save_report_status(project_id, section_key, "completed", section_data)
                        results[section_key] = section_data

                        await self._log_agent(project_id, section_key, "completed", tokens=section_tokens)
                        self._update_project(project_id, {
                            "current_agent": section_key,
                            "progress_percent": pct,
                        })

                        await self._create_notification(
                            user_id=user_id, project_id=project_id,
                            title=f"{display} Complete ✅",
                            message=f"{display} generated successfully.",
                            notification_type="success",
                        )
                        if on_progress:
                            on_progress(section_key, pct, "completed")

                        logger.info(f"Section saved successfully: {section_key}", project_id=project_id)
                    except Exception as save_err:
                        logger.error(f"Failed to save {section_key}", error=str(save_err), project_id=project_id)
                        failed_sections.append(section_key)
                        results[section_key] = {"error": f"Database save failed: {str(save_err)[:200]}"}
                        continue # Continue loop on database save failure

                await asyncio.sleep(0.5)  # Short pause between sequential calls

            # ── 5. Save input hash & finalize ─────────────────
            successful = [k for k in results if "error" not in results[k]]
            final_status = "failed" if not successful else "completed"

            update_data: Dict[str, Any] = {
                "status": final_status,
                "progress_percent": 100 if final_status == "completed" else project.get("progress_percent", 0),
                "current_agent": None,
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }

            if final_status == "completed":
                # Save diagnostics if fully completed
                try:
                    res_diag = self.supabase.table("projects").update({
                        "input_hash": input_hash,
                        "ai_diagnostics": {
                            "sections_completed": len(successful),
                            "sections_cached": len(completed_sections),
                            "total_tokens": tokens_total,
                            "job_id": job_id
                        }
                    }).eq("id", project_id).execute()
                    if hasattr(res_diag, 'error') and res_diag.error:
                        raise Exception(str(res_diag.error))
                except Exception as e:
                    logger.warning("Failed to save ai_diagnostics or input_hash (possibly missing columns)", error=str(e), project_id=project_id)
                
                update_data["error_message"] = None
            else:
                update_data["error_message"] = f"Failed at {failed_sections[0]}: {results.get(failed_sections[0], {}).get('error', 'Unknown')}"

            try:
                res = self.supabase.table("projects").update(update_data).eq("id", project_id).execute()
                if hasattr(res, 'error') and res.error:
                    raise Exception(str(res.error))
            except Exception as e:
                logger.error("Failed to update final project status", error=str(e), project_id=project_id)
                raise Exception(f"Database update failed: {str(e)}")

            # Final notification
            if final_status == "completed":
                title = "Analysis Complete! 🎉"
                message = f"Your startup analysis for '{business_name}' is ready! All {len(SECTION_KEYS)} reports generated."
                notif_type = "success"
            else:
                failed_agent_name = SECTION_DISPLAY.get(failed_sections[0], failed_sections[0])
                title = f"Analysis Failed at {failed_agent_name} ❌"
                message = (
                    f"AI Analysis stopped at {failed_agent_name} for '{business_name}'. "
                    f"Error: {update_data.get('error_message', 'Unknown error')}. "
                    "Completed reports are saved. You can retry to resume."
                )
                notif_type = "error"

            await self._create_notification(
                user_id=user_id, project_id=project_id,
                title=title, message=message, notification_type=notif_type,
            )
            await self._create_activity(
                project_id=project_id, user_id=user_id,
                action="AI Analysis Finished",
                details={
                    "total_tokens": tokens_total,
                    "sections_completed": len(successful),
                    "failed_sections": failed_sections,
                    "job_id": job_id
                },
                icon="check-circle" if final_status == "completed" else "x-circle",
            )

            logger.info(
                "Orchestrator pipeline finished",
                project_id=project_id,
                job_id=job_id,
                status=final_status,
                total_tokens=tokens_total,
            )
            return results

        except Exception as e:
            logger.error(
                "Orchestrator pipeline crashed",
                project_id=project_id,
                job_id=job_id,
                error=str(e),
                traceback=traceback.format_exc(),
            )
            error_msg = self._format_error(e)
            self._update_project(project_id, {
                "status": "failed",
                "error_message": f"Pipeline error: {error_msg}",
                "current_agent": None,
            })
            try:
                await self._create_notification(
                    user_id=project.get("user_id", ""),
                    project_id=project_id,
                    title="Analysis Pipeline Crashed ❌",
                    message=f"System error: {error_msg}",
                    notification_type="error",
                )
            except Exception:
                pass
            raise

    async def regenerate_section(self, project: dict, section_key: str):
        """Regenerate a single section independently and save it."""
        project_id = project.get("id")
        user_id = project.get("user_id")
        display = SECTION_DISPLAY.get(section_key, section_key)

        await self._save_report_status(project_id, section_key, "running")
        
        try:
            section_data, section_tokens = await self._generate_single_section(section_key, project, project_id)
        except Exception as e:
            section_data = {"error": str(e)}

        if not section_data or "error" in section_data:
            error_msg = section_data.get("error", "Unknown error") if section_data else "Empty response"
            await self._log_agent(project_id, section_key, "failed", error_msg)
            await self._save_report_status(project_id, section_key, "failed", {"error": error_msg})
            
            await self._create_notification(
                user_id=user_id, project_id=project_id,
                title=f"{display} Failed ⚠️",
                message=f"Could not regenerate {display}: {error_msg}",
                notification_type="error",
            )
        else:
            await self._save_report_status(project_id, section_key, "completed", section_data)
            await self._log_agent(project_id, section_key, "completed", tokens=section_tokens)
            
            await self._create_notification(
                user_id=user_id, project_id=project_id,
                title=f"{display} Regenerated ✅",
                message=f"{display} regenerated successfully.",
                notification_type="success",
            )

    # ── Core AI Logic ─────────────────────────────────────────

    async def _generate_single_section(
        self, section_key: str, project: dict, project_id: str
    ) -> tuple[dict, int]:
        """
        Generate a single section using a targeted prompt.
        Returns (section_data, tokens_used).
        """
        display = SECTION_DISPLAY[section_key]

        last_error = ""
        # We retry max 2 times (3 attempts total) with exponential backoff inside ai_service.
        # But we will add one loop layer here for validation failures.
        for attempt in range(1, MAX_SECTION_RETRIES + 2):
            try:
                prompt = self.prompt_builder.build_section_prompt(section_key, project)
                response, parsed = await ai_service.generate_json(
                    prompt=prompt,
                    system_prompt=self.prompt_builder.SYSTEM_PROMPT,
                    temperature=0.4,
                    max_tokens=8192,
                )
                tokens = response.tokens_used

                if self._is_valid_section(section_key, parsed):
                    logger.info(
                        f"Section '{section_key}' generated successfully",
                        project_id=project_id,
                        attempt=attempt,
                    )
                    return parsed, tokens
                else:
                    last_error = f"Generated section missing required keys: {SECTION_REQUIRED_KEYS[section_key]}"
                    logger.warning(last_error, project_id=project_id)

            except AIServiceException as e:
                last_error = str(e)
                logger.warning(
                    f"Section '{section_key}' API error on attempt {attempt}",
                    error=last_error, project_id=project_id,
                )

            if attempt <= MAX_SECTION_RETRIES:
                logger.warning(f"Retrying section {section_key} due to validation/API failure", project_id=project_id)
                await asyncio.sleep(2 ** attempt) # Backoff

        # All regen retries failed
        logger.error(
            f"Section '{section_key}' failed after {MAX_SECTION_RETRIES + 1} attempts",
            project_id=project_id, error=last_error,
        )
        return {"error": self._format_error_str(last_error)}, 0

    # ── Cache ─────────────────────────────────────────────────

    def _compute_input_hash(self, project: dict) -> str:
        """SHA-256 hash of all user-defined project inputs."""
        fields = [
            str(project.get("business_name", "")),
            str(project.get("business_idea", "")),
            str(project.get("industry", "")),
            str(project.get("country", "")),
            str(project.get("state", "")),
            str(project.get("target_audience", "")),
            str(project.get("budget", "")),
            str(project.get("budget_currency", "")),
            str(project.get("goals", "")),
            str(project.get("business_stage", "")),
            str(project.get("risk_appetite", "")),
            str(project.get("timeline", "")),
        ]
        raw = "|".join(fields)
        return hashlib.sha256(raw.encode()).hexdigest()[:32]

    async def _get_completed_sections(self, project_id: str, input_hash: str) -> List[str]:
        """
        Returns a list of section keys that are already completed.
        If the input_hash does not match, returns an empty list (requires full regeneration).
        """
        try:
            res = self.supabase.table("projects")\
                .select("input_hash")\
                .eq("id", project_id).execute()
            
            if not res.data:
                return []
                
            project_row = res.data[0]
            if project_row.get("input_hash") != input_hash:
                logger.info("Input hash changed — invalidating cache", project_id=project_id)
                return []

            completed = []
            for section_key, table in TABLE_MAP.items():
                r = self.supabase.table(table)\
                    .select("status")\
                    .eq("project_id", project_id).execute()
                
                if r.data and r.data[0].get("status") == "completed":
                    completed.append(section_key)

            logger.info(f"Found {len(completed)} completed sections in cache", project_id=project_id)
            return completed
        except Exception as e:
            logger.warning("Cache check failed", error=str(e))
            return []

    # ── Validation ────────────────────────────────────────────

    def _is_valid_section(self, section_key: str, data: dict) -> bool:
        """Check that the section has all required top-level keys and is non-empty."""
        if not data or not isinstance(data, dict):
            return False
        required = SECTION_REQUIRED_KEYS.get(section_key, [])
        for key in required:
            if key not in data or not data[key]:
                return False
        return True

    # ── Supabase Helpers ──────────────────────────────────────

    def _update_project(self, project_id: str, data: dict):
        try:
            self.supabase.table("projects").update(data).eq("id", project_id).execute()
        except Exception as e:
            logger.error("Failed to update project", error=str(e), project_id=project_id)

    async def _save_report_status(self, project_id: str, section_key: str, status: str, data: dict = None):
        table = TABLE_MAP.get(section_key)
        if not table:
            return

        record: Dict[str, Any] = {
            "project_id": project_id,
            "status": status,
            "raw_data": data or {},
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        existing = self.supabase.table(table).select("id").eq("project_id", project_id).execute()
        
        if existing.data:
            res = self.supabase.table(table).update(record).eq("project_id", project_id).execute()
        else:
            res = self.supabase.table(table).insert(record).execute()
            
        if hasattr(res, 'error') and res.error:
            raise Exception(f"Supabase returned error: {res.error}")

        logger.info(f"Report saved: {table}", project_id=project_id)

    async def _log_agent(
        self, project_id: str, agent_name: str, status: str,
        error_message: str = "", tokens: int = 0
    ):
        try:
            existing = self.supabase.table("agent_logs")\
                .select("id").eq("project_id", project_id)\
                .eq("agent_name", agent_name).execute()

            data: Dict[str, Any] = {
                "project_id":  project_id,
                "agent_name":  agent_name,
                "status":      status,
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }
            if error_message:
                data["error_message"] = error_message
            if tokens:
                data["tokens_used"] = tokens

            if existing.data:
                self.supabase.table("agent_logs")\
                    .update(data).eq("id", existing.data[0]["id"]).execute()
            else:
                data["started_at"] = datetime.now(timezone.utc).isoformat()
                self.supabase.table("agent_logs").insert(data).execute()
        except Exception as e:
            logger.error("Failed to log agent", error=str(e))

    async def _create_notification(
        self, user_id: str, project_id: str,
        title: str, message: str, notification_type: str
    ):
        try:
            self.supabase.table("notifications").insert({
                "user_id": user_id,
                "project_id": project_id,
                "title": title,
                "message": message,
                "notification_type": notification_type,
                "is_read": False,
            }).execute()
        except Exception as e:
            logger.error("Failed to create notification", error=str(e))

    async def _create_activity(
        self, project_id: str, user_id: str,
        action: str, details: dict, icon: str = "activity"
    ):
        try:
            self.supabase.table("activity_timeline").insert({
                "project_id": project_id,
                "user_id":    user_id,
                "action":     action,
                "details":    details,
                "icon":       icon,
            }).execute()
        except Exception as e:
            logger.error("Failed to create activity", error=str(e))

    # ── Error Formatting ──────────────────────────────────────

    def _format_error(self, exc: Exception) -> str:
        return self._format_error_str(str(exc))

    def _format_error_str(self, err: str) -> str:
        if "429" in err or "quota" in err.lower() or "rate limit" in err.lower():
            return "The configured AI provider has reached its usage limit. Please try again later or configure another provider."
        if "API_KEY_INVALID" in err or "API key not valid" in err or "invalid_api_key" in err.lower():
            return "Gemini API key is invalid. Please check your GEMINI_API_KEY configuration."
        if "timeout" in err.lower():
            return "AI service timed out. Please try again."
        if "No AI providers configured" in err:
            return "No AI providers configured. Please add at least one API key (e.g. GEMINI_API_KEY) to backend/.env."
        if "All AI providers" in err or "all providers" in err.lower():
            return "All AI providers are unavailable. Please check your API keys and try again."
        if "invalid JSON" in err or "JSONDecodeError" in err:
            return f"AI returned malformed data. {err[:200]}"
        # Truncate long raw errors
        if len(err) > 300:
            return err[:300] + "..."
        return err
