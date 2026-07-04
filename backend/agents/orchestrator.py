"""
orchestrator.py — Production-Grade AI Workflow Engine

Architecture:
  Phase 1 (Blocking): Research Agent must complete first
  Phase 2 (Parallel): Competitor, Business Plan, Finance, Marketing run simultaneously

Reliability:
  - Per-agent 4-retry exponential backoff (5s, 15s, 30s, 60s)
  - Provider-level fallback handled by ai_service (Gemini → OpenAI → others)
  - Heartbeat updates every significant step to enable stall detection
  - Checkpoint saves after each successful agent
  - Accurate progress (20% per agent, no jumps or fake percentages)
  - Live status strings: "Calling Gemini", "Parsing Response", etc.
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

# ── Constants ─────────────────────────────────────────────────────────────────

# How much progress each agent contributes
SECTION_PROGRESS = {
    "research":      20,
    "competitor":    40,
    "business_plan": 60,
    "finance":       80,
    "marketing":     100,
}

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

TOTAL_SECTIONS = len(SECTION_KEYS)

# Retry delays per attempt (seconds)
RETRY_DELAYS = [5, 15, 30, 60]
MAX_RETRIES = len(RETRY_DELAYS)  # 4 retries

# Single provider call timeout (seconds)
PROVIDER_TIMEOUT = 90


class AgentOrchestrator:
    """
    Production-grade AI Workflow Engine.

    Guarantees:
    - Every project either completes all 5 reports OR clearly identifies
      which agent failed and why after exhausting all retries.
    - Projects never stay stuck in 'processing' indefinitely.
    - Progress reflects only genuinely completed work.
    - Retry/Resume only re-runs failed/incomplete agents — never completed ones.
    """

    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.prompt_builder = MasterPromptBuilder()

    # ── Settings helpers ───────────────────────────────────────────────────────

    def _load_user_settings(self, user_id: str) -> dict:
        """Load user settings from DB. Falls back to defaults if not found."""
        defaults = {
            "ai_quality": "balanced",
            "ai_provider": "auto",
            "auto_retry": True,
            "max_retries": 3,
            "retry_delay_seconds": 10,
            "parallel_agents": True,
        }
        try:
            res = self.supabase.table("user_settings") \
                .select("ai_quality,ai_provider,auto_retry,max_retries,retry_delay_seconds,parallel_agents") \
                .eq("user_id", user_id) \
                .maybe_single() \
                .execute()
            if res.data:
                return {**defaults, **{k: v for k, v in res.data.items() if v is not None}}
        except Exception as e:
            logger.warning("Could not load user settings, using defaults", error=str(e))
        return defaults

    # ── Public API ─────────────────────────────────────────────────────────────

    async def run(
        self,
        project: dict,
        job_id: str,
        on_progress: ProgressCallback = None,
        target_sections: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Main entry point for running the AI analysis pipeline.

        target_sections: if provided, ONLY these sections will run.
                         Used for retry (failed only) and resume (incomplete only).
        """
        project_id = project["id"]
        user_id = project["user_id"]
        business_name = project.get("business_name", "your business")

        # ── Load user settings to override defaults ──────────────────────────
        user_settings = self._load_user_settings(user_id)
        run_parallel = user_settings.get("parallel_agents", True)
        auto_retry = user_settings.get("auto_retry", True)
        max_retries = user_settings.get("max_retries", 3) if auto_retry else 0
        retry_delay = user_settings.get("retry_delay_seconds", 10)
        # Build retry delays list from user setting
        effective_retry_delays = [retry_delay * (2 ** i) for i in range(max_retries)] if max_retries > 0 else []
        effective_max_retries = max_retries

        logger.info(
            "Orchestrator user settings loaded",
            project_id=project_id,
            ai_quality=user_settings.get("ai_quality"),
            ai_provider=user_settings.get("ai_provider"),
            run_parallel=run_parallel,
            max_retries=effective_max_retries,
            retry_delay=retry_delay,
        )

        try:
            input_hash = self._compute_input_hash(project)

            # ── Determine which sections need to run ─────────────────────────
            if target_sections is not None:
                # Explicit list given (retry/resume mode)
                missing_sections = [s for s in SECTION_KEYS if s in target_sections]
            else:
                # Full run: check cache, skip already-completed sections
                completed_sections = await self._get_completed_sections(project_id, input_hash)
                missing_sections = [s for s in SECTION_KEYS if s not in completed_sections]

                if not missing_sections:
                    # Cache hit — all sections already complete
                    await self._create_notification(
                        user_id=user_id, project_id=project_id,
                        title="Reports Loaded from Cache ⚡",
                        message=f"No changes detected for '{business_name}'. Your existing reports are still valid.",
                        notification_type="info",
                    )
                    self._update_project(project_id, {
                        "status": "completed",
                        "progress_percent": 100,
                        "current_agent": None,
                        "current_step": None,
                        "completed_at": datetime.now(timezone.utc).isoformat(),
                    })
                    return {"cached": True}

                if completed_sections:
                    await self._create_notification(
                        user_id=user_id, project_id=project_id,
                        title="Resuming Analysis 🔄",
                        message=f"Resuming '{business_name}'. {len(completed_sections)}/{TOTAL_SECTIONS} sections already complete.",
                        notification_type="info",
                    )
                else:
                    await self._create_notification(
                        user_id=user_id, project_id=project_id,
                        title="AI Analysis Started 🚀",
                        message=f"5 AI agents are analyzing '{business_name}' to generate your complete startup blueprint.",
                        notification_type="info",
                    )

            # Compute already-done sections for accurate progress base
            already_done = await self._get_completed_section_keys(project_id)
            base_progress = sum(20 for s in already_done if s not in missing_sections)

            # Set project to processing
            self._update_project(project_id, {
                "status": "processing",
                "progress_percent": base_progress,
                "current_agent": missing_sections[0] if missing_sections else None,
                "current_step": "Starting",
                "error_message": None,
            })
            await self._heartbeat(project_id)

            results: Dict[str, Any] = {}
            failed_sections: List[str] = []
            tokens_total = 0

            # Load research data if already completed (for parallel agents that need it)
            research_data = await self._load_research_data(project_id)

            # ── PHASE 1: Research (Blocking) ─────────────────────────────────
            if "research" in missing_sections:
                logger.info("Phase 1: Research Agent (blocking)", project_id=project_id)
                result = await self._run_agent_with_retry(
                    section_key="research",
                    project=project,
                    project_id=project_id,
                    research_context=None,
                    base_progress=base_progress,
                    on_progress=on_progress,
                    ai_quality=ai_quality,
                    ai_provider=ai_provider,
                )

                if result["success"]:
                    research_data = result["data"]
                    results["research"] = result["data"]
                    tokens_total += result.get("tokens", 0)
                    base_progress = SECTION_PROGRESS["research"]
                    await self._save_checkpoint(
                        project=project,
                        section_key="research",
                        data=result["data"],
                        provider=result.get("provider", "unknown"),
                        runtime_ms=result.get("runtime_ms", 0),
                        retries=result.get("retries", 0),
                    )
                    self._update_project(project_id, {"progress_percent": 20})
                    await self._heartbeat(project_id)
                    if on_progress:
                        on_progress("research", 20, "completed")
                    missing_sections.remove("research")
                else:
                    # Research failed — cannot continue pipeline
                    error_msg = result.get("error", "Research Agent failed after all retries")
                    failed_sections.append("research")
                    results["research"] = {"error": error_msg}
                    await self._save_report_status(project_id, "research", "failed", {"error": error_msg})
                    await self._log_agent(project_id, "research", "failed", error_msg)
                    await self._create_notification(
                        user_id=user_id, project_id=project_id,
                        title="Research Failed ⚠️",
                        message=f"Market Research failed after all retries: {error_msg[:120]}",
                        notification_type="error",
                    )
                    # Halt — all other agents need research
                    missing_sections.clear()
                    logger.error("Research failed — halting pipeline", project_id=project_id)

            # ── PHASE 2: Parallel Agents ─────────────────────────────────────
            if missing_sections:
                logger.info(
                    "Phase 2: Parallel agents starting",
                    project_id=project_id,
                    agents=missing_sections,
                )
                # Mark all parallel agents as 'running' in DB immediately
                for sk in missing_sections:
                    await self._save_report_status(project_id, sk, "running")

                self._update_project(project_id, {
                    "current_agent": missing_sections[0],
                    "current_step": "Running parallel analysis" if run_parallel else "Running sequential analysis",
                    "progress_percent": base_progress,
                })
                await self._heartbeat(project_id)

                if run_parallel:
                    # Run all parallel agents concurrently
                    parallel_tasks = [
                        self._run_agent_with_retry(
                            section_key=sk,
                            project=project,
                            project_id=project_id,
                            research_context=research_data,
                            base_progress=base_progress,
                            on_progress=on_progress,
                            effective_retry_delays=effective_retry_delays,
                            effective_max_retries=effective_max_retries,
                            ai_quality=ai_quality,
                            ai_provider=ai_provider,
                        )
                        for sk in missing_sections
                    ]
                    parallel_results = await asyncio.gather(*parallel_tasks, return_exceptions=True)
                else:
                    # Sequential execution (user preference)
                    parallel_results = []
                    for sk in missing_sections:
                        result = await self._run_agent_with_retry(
                            section_key=sk,
                            project=project,
                            project_id=project_id,
                            research_context=research_data,
                            base_progress=base_progress,
                            on_progress=on_progress,
                            effective_retry_delays=effective_retry_delays,
                            effective_max_retries=effective_max_retries,
                            ai_quality=ai_quality,
                            ai_provider=ai_provider,
                        )
                        parallel_results.append(result)

                for sk, outcome in zip(missing_sections, parallel_results):
                    display = SECTION_DISPLAY[sk]
                    pct = SECTION_PROGRESS[sk]

                    if isinstance(outcome, Exception):
                        error_msg = f"Agent crashed: {str(outcome)[:200]}"
                        failed_sections.append(sk)
                        results[sk] = {"error": error_msg}
                        await self._save_report_status(project_id, sk, "failed", {"error": error_msg})
                        await self._log_agent(project_id, sk, "failed", error_msg)
                        await self._create_notification(
                            user_id=user_id, project_id=project_id,
                            title=f"{display} Failed ⚠️",
                            message=f"{display} crashed: {error_msg[:100]}",
                            notification_type="error",
                        )
                        continue

                    if outcome["success"]:
                        results[sk] = outcome["data"]
                        tokens_total += outcome.get("tokens", 0)
                        await self._save_checkpoint(
                            project=project,
                            section_key=sk,
                            data=outcome["data"],
                            provider=outcome.get("provider", "unknown"),
                            runtime_ms=outcome.get("runtime_ms", 0),
                            retries=outcome.get("retries", 0),
                        )
                        self._update_project(project_id, {"progress_percent": pct})
                        await self._heartbeat(project_id)
                        if on_progress:
                            on_progress(sk, pct, "completed")
                        await self._create_notification(
                            user_id=user_id, project_id=project_id,
                            title=f"{display} Complete ✅",
                            message=f"{display} successfully generated.",
                            notification_type="success",
                        )
                    else:
                        error_msg = outcome.get("error", "Unknown error")
                        failed_sections.append(sk)
                        results[sk] = {"error": error_msg}
                        await self._save_report_status(project_id, sk, "failed", {"error": error_msg})
                        await self._log_agent(project_id, sk, "failed", error_msg)
                        await self._create_notification(
                            user_id=user_id, project_id=project_id,
                            title=f"{display} Failed ⚠️",
                            message=f"{display} failed after all retries: {error_msg[:100]}",
                            notification_type="error",
                        )

            # ── Compute Final Status ──────────────────────────────────────────
            successful = [k for k in results if "error" not in results[k]]
            n_successful = len(successful)
            total_known = n_successful + len(failed_sections)

            # Also count sections that were already done before this run
            already_done_keys = await self._get_completed_section_keys(project_id)
            final_done = set(already_done_keys) | set(successful)
            n_final = len(final_done)

            if n_final == TOTAL_SECTIONS:
                final_status = "completed"
            elif n_final > 0 or n_successful > 0:
                final_status = "partial"
            else:
                final_status = "failed"

            update_data: Dict[str, Any] = {
                "status": final_status,
                "progress_percent": 100 if final_status == "completed" else max(
                    (SECTION_PROGRESS.get(s, 0) for s in final_done), default=0
                ),
                "current_agent": None,
                "current_step": None,
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "input_hash": input_hash,
            }

            if final_status == "completed":
                update_data["error_message"] = None
            elif final_status == "partial":
                update_data["error_message"] = (
                    f"Partial: {len(final_done)}/{TOTAL_SECTIONS} reports done. "
                    f"Failed: {', '.join(SECTION_DISPLAY.get(s, s) for s in failed_sections)}. "
                    "Use 'Retry' on failed reports."
                )
            else:
                first_fail = failed_sections[0] if failed_sections else "unknown"
                first_err = results.get(first_fail, {}).get("error", "Unknown error")
                update_data["error_message"] = f"Analysis failed: {first_err[:300]}"

            # Save per-agent diagnostics
            try:
                diag_data = {}
                for sk in SECTION_KEYS:
                    if sk in results and "error" not in results[sk]:
                        diag_data[sk] = {"status": "success"}
                    elif sk in failed_sections:
                        diag_data[sk] = {
                            "status": "error",
                            "error": results.get(sk, {}).get("error", "")[:200],
                        }
                    else:
                        diag_data[sk] = {"status": "success"}  # was already done

                self.supabase.table("projects").update({
                    "ai_diagnostics": diag_data,
                    "input_hash": input_hash,
                }).eq("id", project_id).execute()
            except Exception as diag_err:
                logger.warning("Failed to save ai_diagnostics", error=str(diag_err))

            self._update_project(project_id, update_data)

            # Final notification
            if final_status == "completed":
                await self._create_notification(
                    user_id=user_id, project_id=project_id,
                    title="Analysis Complete! 🎉",
                    message=f"All 5 reports for '{business_name}' are ready. View your Startup Blueprint.",
                    notification_type="success",
                )
            elif final_status == "partial":
                await self._create_notification(
                    user_id=user_id, project_id=project_id,
                    title="Analysis Partially Complete ⚠️",
                    message=(
                        f"{len(final_done)}/{TOTAL_SECTIONS} reports generated. "
                        f"Failed: {', '.join(SECTION_DISPLAY.get(s, s) for s in failed_sections)}. "
                        "Use 'Retry' to complete missing reports."
                    ),
                    notification_type="warning",
                )
            else:
                await self._create_notification(
                    user_id=user_id, project_id=project_id,
                    title="Analysis Failed ❌",
                    message=f"AI Analysis failed for '{business_name}'. {update_data.get('error_message', '')[:200]}",
                    notification_type="error",
                )

            logger.info(
                "Orchestrator pipeline finished",
                project_id=project_id,
                job_id=job_id,
                status=final_status,
                n_successful=n_successful,
                failed=failed_sections,
            )
            return results

        except Exception as e:
            logger.error(
                "Orchestrator pipeline crashed",
                project_id=project_id,
                error=str(e),
                traceback=traceback.format_exc(),
            )
            error_msg = self._format_error(e)
            self._update_project(project_id, {
                "status": "failed",
                "error_message": f"Pipeline crashed: {error_msg}",
                "current_agent": None,
                "current_step": None,
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

    async def regenerate_section(self, project: dict, section_key: str) -> dict:
        """
        Regenerate one individual section on-demand (triggered by Regenerate button).
        Does NOT touch other sections.
        """
        if section_key not in SECTION_KEYS:
            raise ValueError(f"Unknown section: {section_key}")

        project_id = project["id"]
        user_id = project.get("user_id", "")
        display = SECTION_DISPLAY[section_key]

        user_settings = self._load_user_settings(user_id)
        ai_quality = user_settings.get("ai_quality", "balanced")
        ai_provider = user_settings.get("ai_provider", "auto")

        # Calculate base progress from other completed sections
        done = await self._get_completed_section_keys(project_id)
        base_progress = sum(20 for k in done if k != section_key)

        self._update_project(project_id, {
            "status": "processing",
            "current_agent": section_key,
            "current_step": "Starting regeneration",
            "progress_percent": base_progress,
        })
        await self._heartbeat(project_id)

        # Update the report itself to 'running' so the dashboard instantly updates
        await self._save_report_status(
            project_id=project_id,
            section_key=section_key,
            status="running",
            raw_data={"progress_step": "Regenerating...", "progress_percent": 0}
        )

        # Load research context if needed
        research_data = None
        if section_key != "research":
            research_data = await self._load_research_data(project_id)

        result = await self._run_agent_with_retry(
            section_key=section_key,
            project=project,
            project_id=project_id,
            research_context=research_data,
            base_progress=base_progress,
            on_progress=None,
            ai_quality=ai_quality,
            ai_provider=ai_provider,
        )

        if not result["success"]:
            error_msg = result.get("error", "Unknown error")
            await self._save_report_status(project_id, section_key, "failed", {"error": error_msg})
            await self._log_agent(project_id, section_key, "failed", error_msg)
            await self._create_notification(
                user_id=user_id, project_id=project_id,
                title=f"{display} Failed ⚠️",
                message=f"Could not regenerate {display}: {error_msg[:120]}",
                notification_type="error",
            )
            await self._recompute_project_status(project_id, user_id, project.get("business_name", ""))
            raise AIServiceException(error_msg)

        await self._save_checkpoint(
            project=project,
            section_key=section_key,
            data=result["data"],
            provider=result.get("provider", "unknown"),
            runtime_ms=result.get("runtime_ms", 0),
            retries=result.get("retries", 0),
        )
        await self._log_agent(project_id, section_key, "completed", tokens=result.get("tokens", 0))
        await self._create_notification(
            user_id=user_id, project_id=project_id,
            title=f"{display} Regenerated ✅",
            message=f"{display} regenerated successfully.",
            notification_type="success",
        )
        await self._recompute_project_status(project_id, user_id, project.get("business_name", ""))
        return result["data"]

    # ── Core: Agent with Retry ────────────────────────────────────────────────

    async def _run_agent_with_retry(
        self,
        section_key: str,
        project: dict,
        project_id: str,
        research_context: Optional[dict],
        base_progress: int,
        on_progress: ProgressCallback,
        effective_retry_delays: Optional[List[int]] = None,
        effective_max_retries: Optional[int] = None,
        ai_quality: str = "balanced",
        ai_provider: str = "auto",
    ) -> dict:
        """
        Run a single agent with configurable retries (exponential backoff).
        Returns: {"success": bool, "data": dict, "error": str, "provider": str, "tokens": int, "retries": int, "runtime_ms": float}
        """
        # Use user settings if provided, otherwise fall back to module-level defaults
        retry_delays = effective_retry_delays if effective_retry_delays is not None else RETRY_DELAYS
        max_retries = effective_max_retries if effective_max_retries is not None else MAX_RETRIES
        display = SECTION_DISPLAY[section_key]
        last_error = ""
        t_start = asyncio.get_event_loop().time()

        for attempt in range(max_retries + 1):
            if attempt > 0:
                delay = retry_delays[attempt - 1] if attempt - 1 < len(retry_delays) else retry_delays[-1]
                logger.warning(
                    f"Retrying {section_key} (attempt {attempt + 1}/{max_retries + 1}) after {delay}s",
                    project_id=project_id,
                    last_error=last_error[:200],
                )
                # Update DB so UI shows retry status
                self._update_project(project_id, {
                    "current_agent": section_key,
                    "current_step": f"Retry {attempt}/{max_retries} — waiting {delay}s",
                })
                await self._heartbeat(project_id)
                await asyncio.sleep(delay)

            # Update step: about to call AI
            self._update_project(project_id, {
                "current_agent": section_key,
                "current_step": "Generating prompt",
            })
            await self._heartbeat(project_id)

            try:
                prompt = self.prompt_builder.build_section_prompt(
                    section_key, project, research_context=research_context
                )

                self._update_project(project_id, {
                    "current_step": "Calling AI provider",
                })
                await self._heartbeat(project_id)

                temp = 0.4
                tokens = 8192
                if ai_quality == "fast":
                    temp = 0.7
                    tokens = 4096
                elif ai_quality == "high":
                    temp = 0.2
                    tokens = 16384

                response, parsed = await ai_service.generate_json(
                    prompt=prompt,
                    system_prompt=self.prompt_builder.SYSTEM_PROMPT,
                    temperature=temp,
                    max_tokens=tokens,
                    preferred_provider=None if ai_provider == "auto" else ai_provider,
                )

                provider_used = response.provider
                tokens = response.tokens_used

                self._update_project(project_id, {
                    "current_step": "Parsing response",
                })
                await self._heartbeat(project_id)

                if self._is_valid_section(section_key, parsed):
                    runtime_ms = (asyncio.get_event_loop().time() - t_start) * 1000
                    logger.info(
                        f"Agent '{section_key}' succeeded",
                        project_id=project_id,
                        attempt=attempt + 1,
                        provider=provider_used,
                        runtime_ms=round(runtime_ms),
                    )
                    self._update_project(project_id, {
                        "current_step": "Saving report",
                    })
                    return {
                        "success": True,
                        "data": parsed,
                        "provider": provider_used,
                        "tokens": tokens,
                        "retries": attempt,
                        "runtime_ms": runtime_ms,
                    }
                else:
                    last_error = f"Generated section missing required keys for '{section_key}'"
                    logger.warning(last_error, project_id=project_id)

            except AIServiceException as e:
                last_error = str(e)
                logger.warning(
                    f"Agent '{section_key}' AI error on attempt {attempt + 1}",
                    error=last_error[:200],
                    project_id=project_id,
                )
            except asyncio.TimeoutError:
                last_error = f"Agent timed out after {PROVIDER_TIMEOUT}s"
                logger.warning(
                    f"Agent '{section_key}' timeout on attempt {attempt + 1}",
                    project_id=project_id,
                )
            except Exception as e:
                last_error = f"Unexpected error: {str(e)[:200]}"
                logger.error(
                    f"Agent '{section_key}' crashed on attempt {attempt + 1}",
                    error=last_error,
                    project_id=project_id,
                    traceback=traceback.format_exc(),
                )

        # All retries exhausted
        runtime_ms = (asyncio.get_event_loop().time() - t_start) * 1000
        logger.error(
            f"Agent '{section_key}' failed after all {MAX_RETRIES + 1} attempts",
            project_id=project_id,
            last_error=last_error[:300],
        )
        return {
            "success": False,
            "error": self._format_error_str(last_error),
            "retries": MAX_RETRIES,
            "runtime_ms": runtime_ms,
        }

    # ── Cache / Completion Checks ─────────────────────────────────────────────

    def _compute_input_hash(self, project: dict) -> str:
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
        """Return completed section keys, but only if the input hash hasn't changed."""
        try:
            res = self.supabase.table("projects").select("input_hash").eq("id", project_id).execute()
            if not res.data or res.data[0].get("input_hash") != input_hash:
                return []
            return await self._get_completed_section_keys(project_id)
        except Exception as e:
            logger.warning("Cache check failed", error=str(e))
            return []

    async def _get_completed_section_keys(self, project_id: str) -> List[str]:
        """Return all section keys that are currently 'completed' in the DB."""
        completed = []
        for sk, table in TABLE_MAP.items():
            try:
                r = self.supabase.table(table).select("status").eq("project_id", project_id).execute()
                if r.data and r.data[0].get("status") == "completed":
                    completed.append(sk)
            except Exception:
                pass
        return completed

    async def _load_research_data(self, project_id: str) -> Optional[dict]:
        """Load existing research report data from DB."""
        try:
            res = self.supabase.table("research_reports").select("raw_data, status").eq("project_id", project_id).execute()
            if res.data and res.data[0].get("status") == "completed":
                return res.data[0].get("raw_data")
        except Exception as e:
            logger.warning("Failed to load research data", error=str(e))
        return None

    # ── Validation ────────────────────────────────────────────────────────────

    def _is_valid_section(self, section_key: str, data: dict) -> bool:
        if not data or not isinstance(data, dict):
            return False
        required = SECTION_REQUIRED_KEYS.get(section_key, [])
        for key in required:
            if key not in data or not data[key]:
                return False
        return True

    # ── Checkpoint / Save ─────────────────────────────────────────────────────

    async def _save_checkpoint(
        self,
        project: dict,
        section_key: str,
        data: dict,
        provider: str,
        runtime_ms: float,
        retries: int,
    ):
        """Save a completed report with full metadata checkpoint."""
        project_id = project["id"]
        table = TABLE_MAP.get(section_key)
        if not table:
            return
        record = {
            "project_id": project_id,
            "status": "completed",
            "raw_data": data,
            "provider_used": provider,
            "runtime_ms": round(runtime_ms),
            "retry_count": retries,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            try:
                # Try fetching with versioning columns
                existing = self.supabase.table(table).select("id, version, previous_versions, raw_data, updated_at, provider_used").eq("project_id", project_id).execute()
            except Exception as select_err:
                # Fallback if the user hasn't run the SQL migration yet (columns don't exist)
                logger.warning(f"Versioning columns may not exist yet, falling back to basic select: {select_err}")
                existing = self.supabase.table(table).select("id").eq("project_id", project_id).execute()
                
            if existing.data:
                old_record = existing.data[0]
                version = old_record.get("version") or 1
                previous_versions = old_record.get("previous_versions") or []
                old_raw_data = old_record.get("raw_data")
                
                if old_raw_data and "version" in old_record:
                    history_entry = {
                        "version": version,
                        "raw_data": old_raw_data,
                        "updated_at": old_record.get("updated_at"),
                        "provider_used": old_record.get("provider_used")
                    }
                    if not isinstance(previous_versions, list):
                        previous_versions = []
                    previous_versions.append(history_entry)
                    record["previous_versions"] = previous_versions
                    record["version"] = version + 1
                    
                self.supabase.table(table).update(record).eq("project_id", project_id).execute()
            else:
                try:
                    record["version"] = 1
                    record["previous_versions"] = []
                    record["created_at"] = datetime.now(timezone.utc).isoformat()
                    self.supabase.table(table).insert(record).execute()
                except Exception as insert_err:
                    # If insert fails due to missing columns, remove versioning columns and retry
                    record.pop("version", None)
                    record.pop("previous_versions", None)
                    self.supabase.table(table).insert(record).execute()
                    
            try:
                export_record = {
                    "user_id": project.get("user_id"),
                    "project_id": project_id,
                    "project_name": project.get("business_name", ""),
                    "industry": project.get("industry", ""),
                    "country": project.get("country", ""),
                    "report_type": section_key,
                    "status": "completed",
                    "content": data,
                    "generated_by": provider,
                    "version": record.get("version", 1),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
                existing_export = self.supabase.table("exports").select("id").eq("project_id", project_id).eq("report_type", section_key).execute()
                if existing_export.data:
                    self.supabase.table("exports").update(export_record).eq("id", existing_export.data[0]["id"]).execute()
                else:
                    export_record["created_at"] = datetime.now(timezone.utc).isoformat()
                    self.supabase.table("exports").insert(export_record).execute()
            except Exception as export_err:
                logger.warning(f"Failed to update exports table: {export_err}")
                    
            logger.info(f"Checkpoint saved: {section_key} via {provider}", project_id=project_id)
        except Exception as e:
            # Try again with minimal payload (columns might not all exist yet)
            logger.warning(f"Checkpoint save failed with full payload, trying minimal: {e}")
            try:
                minimal = {
                    "project_id": project_id,
                    "status": "completed",
                    "raw_data": data,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
                existing = self.supabase.table(table).select("id").eq("project_id", project_id).execute()
                if existing.data:
                    self.supabase.table(table).update(minimal).eq("project_id", project_id).execute()
                else:
                    self.supabase.table(table).insert(minimal).execute()
                logger.info(f"Checkpoint saved (minimal): {section_key}", project_id=project_id)
            except Exception as e2:
                logger.error(f"Failed to save checkpoint for {section_key}", error=str(e2))
                raise

    async def _save_report_status(self, project_id: str, section_key: str, status: str, data: dict = None):
        """Set a section's status without full data (e.g., 'running' or 'failed')."""
        table = TABLE_MAP.get(section_key)
        if not table:
            return
        record = {
            "project_id": project_id,
            "status": status,
            "raw_data": data or {},
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            existing = self.supabase.table(table).select("id").eq("project_id", project_id).execute()
            if existing.data:
                self.supabase.table(table).update(record).eq("project_id", project_id).execute()
            else:
                self.supabase.table(table).insert(record).execute()
        except Exception as e:
            logger.error(f"Failed to set report status {section_key}={status}", error=str(e))

    # ── Project Status Recompute ──────────────────────────────────────────────

    async def _recompute_project_status(self, project_id: str, user_id: str, business_name: str) -> str:
        try:
            statuses = {}
            for sk, table in TABLE_MAP.items():
                try:
                    r = self.supabase.table(table).select("status").eq("project_id", project_id).execute()
                    statuses[sk] = r.data[0].get("status", "pending") if r.data else "pending"
                except Exception:
                    statuses[sk] = "pending"

            n_completed = sum(1 for s in statuses.values() if s == "completed")
            n_failed = sum(1 for s in statuses.values() if s == "failed")
            failed_keys = [k for k, s in statuses.items() if s == "failed"]

            if n_completed == TOTAL_SECTIONS:
                new_status = "completed"
                progress = 100
            elif n_completed > 0:
                new_status = "partial"
                done_keys = [k for k, s in statuses.items() if s == "completed"]
                progress = max((SECTION_PROGRESS.get(k, 0) for k in done_keys), default=0)
            elif n_failed > 0:
                new_status = "failed"
                progress = 0
            else:
                new_status = "draft"
                progress = 0

            update = {
                "status": new_status,
                "progress_percent": progress,
                "current_agent": None,
                "current_step": None,
            }
            if new_status == "completed":
                update["completed_at"] = datetime.now(timezone.utc).isoformat()
                update["error_message"] = None
                await self._create_notification(
                    user_id=user_id, project_id=project_id,
                    title="All Reports Complete! 🎉",
                    message=f"All {TOTAL_SECTIONS} reports for '{business_name}' are now ready.",
                    notification_type="success",
                )
            elif new_status == "partial":
                update["error_message"] = (
                    f"Partial: {n_completed}/{TOTAL_SECTIONS} done. "
                    f"Failed: {', '.join(SECTION_DISPLAY.get(k, k) for k in failed_keys)}. "
                    "Use 'Retry' to complete missing reports."
                )

            self._update_project(project_id, update)
            logger.info(f"Status recomputed: {new_status}", project_id=project_id, n_completed=n_completed)
            return new_status
        except Exception as e:
            logger.error("Failed to recompute project status", error=str(e))
            return "partial"

    # ── Supabase Helpers ──────────────────────────────────────────────────────

    def _update_project(self, project_id: str, data: dict):
        try:
            self.supabase.table("projects").update(data).eq("id", project_id).execute()
        except Exception as e:
            logger.error("Failed to update project", error=str(e), project_id=project_id)

    async def _heartbeat(self, project_id: str):
        """Update the heartbeat timestamp so the watchdog knows this pipeline is alive."""
        try:
            self.supabase.table("projects").update({
                "heartbeat": datetime.now(timezone.utc).isoformat()
            }).eq("id", project_id).execute()
        except Exception:
            pass  # Non-critical — don't interrupt the pipeline

    async def _log_agent(
        self, project_id: str, agent_name: str, status: str,
        error_message: str = "", tokens: int = 0
    ):
        try:
            existing = self.supabase.table("agent_logs") \
                .select("id").eq("project_id", project_id) \
                .eq("agent_name", agent_name).execute()
            data = {
                "project_id": project_id,
                "agent_name": agent_name,
                "status": status,
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }
            if error_message:
                data["error_message"] = error_message[:500]
            if tokens:
                data["tokens_used"] = tokens
            if existing.data:
                self.supabase.table("agent_logs").update(data).eq("id", existing.data[0]["id"]).execute()
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

    # ── Error Formatting ──────────────────────────────────────────────────────

    def _format_error(self, exc: Exception) -> str:
        return self._format_error_str(str(exc))

    def _format_error_str(self, err: str) -> str:
        if "429" in err or "quota" in err.lower() or "rate limit" in err.lower():
            return "AI provider quota exceeded. All providers tried. Please wait and retry."
        if "API_KEY_INVALID" in err or "API key not valid" in err or "invalid_api_key" in err.lower():
            return "AI provider API key is invalid. Check your GEMINI_API_KEY / OPENAI_API_KEY."
        if "timeout" in err.lower():
            return "AI provider timed out. Please retry."
        if "No AI providers" in err or "All AI providers" in err:
            return "No AI providers are available. Check your API keys in backend/.env."
        if len(err) > 300:
            return err[:300] + "..."
        return err
