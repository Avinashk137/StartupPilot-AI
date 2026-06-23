import asyncio
import traceback
from typing import Optional, Callable, Dict, Any
from datetime import datetime, timezone
import structlog

from .agents import (
    ResearchAgent, CompetitorAgent, BusinessPlanAgent, FinanceAgent,
    MarketingAgent, AdvertisementAgent, AnalyticsAgent,
    StrategyMasterAgent, ExecutionMasterAgent
)

logger = structlog.get_logger()
ProgressCallback = Optional[Callable[[str, int, str], None]]

AGENT_DISPLAY_NAMES = {
    "research": "Research Agent",
    "competitor": "Competitor Analysis Agent",
    "business_plan": "Business Plan Agent",
    "finance": "Finance Report Agent",
    "marketing": "Marketing Strategy Agent",
    "advertisement": "Advertisement Agent",
    "analytics": "CEO Analytics Agent",
}


class AgentOrchestrator:
    MASTER_PIPELINE = [
        ("strategy_master", StrategyMasterAgent, [
            ("research", 28),
            ("competitor", 42),
            ("business_plan", 56),
        ]),
        ("execution_master", ExecutionMasterAgent, [
            ("finance", 70),
            ("marketing", 84),
            ("advertisement", 98),
            ("analytics", 100),
        ])
    ]
    MAX_AGENT_RETRIES = 3

    def __init__(self, supabase_client):
        self.supabase = supabase_client

    async def run(
        self,
        project: dict,
        on_progress: ProgressCallback = None,
    ) -> Dict[str, Any]:
        project_id = project["id"]
        context = {"project": project}
        results = {}
        total_tokens = 0

        try:
            # ── Mark project as processing ─────────────────────
            self.supabase.table("projects").update({
                "status": "processing",
                "progress_percent": 0,
                "error_message": None,
                "current_agent": None,
            }).eq("id", project_id).execute()

            await self._create_notification(
                user_id=project["user_id"],
                project_id=project_id,
                title="AI Analysis Started",
                message=f"7 AI agents are now analyzing '{project.get('business_name')}'. This takes 3–5 minutes.",
                notification_type="info",
            )
            await self._create_activity(
                project_id=project_id,
                user_id=project["user_id"],
                action="AI Analysis Started",
                details={"agents": 7},
                icon="play-circle",
            )

            # ── Run each master agent ─────────────────────────────────
            for master_key, MasterAgentClass, sub_agents in self.MASTER_PIPELINE:
                logger.info(f"Master Agent Started: {master_key}", project_id=project_id)
                
                # Update UI to first sub-agent
                first_sub_key = sub_agents[0][0]
                first_sub_pct = sub_agents[0][1]
                self.supabase.table("projects").update({
                    "current_agent": first_sub_key,
                    "progress_percent": max(0, first_sub_pct - 14),
                }).eq("id", project_id).execute()
                if on_progress:
                    on_progress(first_sub_key, first_sub_pct - 14, "running")

                # ── Per-agent retry loop ───────────────────────
                agent_succeeded = False
                last_error = ""
                for attempt in range(1, self.MAX_AGENT_RETRIES + 1):
                    try:
                        logger.info(
                            f"Master Agent {master_key} attempt {attempt}/{self.MAX_AGENT_RETRIES}",
                            project_id=project_id,
                        )
                        agent = MasterAgentClass()
                        agent_result = await agent.execute(context)

                        master_data = agent_result.get("data", {})

                        if not master_data:
                            raise ValueError(f"Agent returned empty data on attempt {attempt}")

                        context[f"{master_key}_data"] = master_data
                        total_tokens += agent_result.get("tokens_used", 0)

                        # Process sub-agents
                        for sub_key, pct in sub_agents:
                            sub_data = master_data.get(sub_key, {})
                            results[sub_key] = sub_data
                            context[f"{sub_key}_data"] = sub_data

                            agent_log = await self._create_agent_log(project_id, sub_key)
                            log_id = agent_log.get("id")

                            await self._save_report(project_id, sub_key, sub_data)
                            logger.info(f"Database Saved: {sub_key}", project_id=project_id)

                            if log_id:
                                duration_ms = agent_result.get("duration_ms", 0) // len(sub_agents)
                                tokens_used = agent_result.get("tokens_used", 0) // len(sub_agents)
                                self.supabase.table("agent_logs").update({
                                    "status": "completed",
                                    "ai_provider": agent_result.get("provider", ""),
                                    "ai_model": agent_result.get("model", ""),
                                    "tokens_used": tokens_used,
                                    "duration_ms": duration_ms,
                                    "output_summary": f"Completed via {master_key} attempt {attempt}",
                                    "completed_at": datetime.now(timezone.utc).isoformat(),
                                }).eq("id", log_id).execute()

                            self.supabase.table("projects").update({
                                "current_agent": sub_key,
                                "progress_percent": pct,
                            }).eq("id", project_id).execute()

                            display_name = AGENT_DISPLAY_NAMES.get(sub_key, sub_key)
                            await self._create_notification(
                                user_id=project["user_id"],
                                project_id=project_id,
                                title=f"{display_name} completed",
                                message=f"{display_name} completed successfully.",
                                notification_type="success",
                            )

                            if on_progress:
                                on_progress(sub_key, pct, "completed")
                            
                            logger.info(f"Agent Completed: {sub_key}", project_id=project_id)
                            await asyncio.sleep(0.5)

                        agent_succeeded = True
                        break  # exit retry loop on success

                    except Exception as e:
                        last_error = str(e)
                        logger.error(
                            f"Agent {master_key} failed on attempt {attempt}",
                            error=last_error,
                            project_id=project_id,
                            traceback=traceback.format_exc(),
                        )
                        if attempt < self.MAX_AGENT_RETRIES:
                            wait = 2 ** attempt  # exponential backoff: 2s, 4s
                            logger.info(f"Retrying {master_key} in {wait}s...")
                            await asyncio.sleep(wait)

                # ── Handle permanent failure after all retries ─
                if not agent_succeeded:
                    logger.error(
                        f"Agent {master_key} failed after {self.MAX_AGENT_RETRIES} retries",
                        project_id=project_id,
                        error=last_error,
                    )
                    for sub_key, pct in sub_agents:
                        results[sub_key] = {"error": last_error}
                        agent_log = await self._create_agent_log(project_id, sub_key)
                        log_id = agent_log.get("id")
                        if log_id:
                            self.supabase.table("agent_logs").update({
                                "status": "failed",
                                "error_message": last_error,
                                "completed_at": datetime.now(timezone.utc).isoformat(),
                            }).eq("id", log_id).execute()

                        display_name = AGENT_DISPLAY_NAMES.get(sub_key, sub_key)
                        await self._create_notification(
                            user_id=project["user_id"],
                            project_id=project_id,
                            title=f"{display_name} failed",
                            message=f"Error: {last_error}",
                            notification_type="error",
                        )

                        if on_progress:
                            on_progress(sub_key, pct, "failed")
                            
                    # Abort pipeline
                    break

            # ── Finalize project ───────────────────────────────
            successful_agents = [k for k, v in results.items() if "error" not in v]
            failed_agents = [k for k, v in results.items() if "error" in v]
            has_any_success = len(successful_agents) > 0
            all_failed = len(failed_agents) == 7

            final_status = "failed" if all_failed else "completed"

            self.supabase.table("projects").update({
                "status": final_status,
                "progress_percent": 100,
                "current_agent": None,
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "error_message": (
                    f"{len(failed_agents)} agent(s) failed: {', '.join(failed_agents)}"
                    if failed_agents else None
                ),
            }).eq("id", project_id).execute()

            if final_status == "completed":
                title = "Analysis Complete! 🎉"
                message = (
                    f"Your startup analysis for '{project.get('business_name')}' is ready! "
                    f"{len(successful_agents)}/7 agents completed successfully."
                )
                notif_type = "success"
            else:
                title = "Analysis Failed"
                fail_msg = results[failed_agents[0]]["error"] if failed_agents else "Unknown error."
                message = f"AI Analysis Failed: {fail_msg}"
                notif_type = "error"

            await self._create_notification(
                user_id=project["user_id"],
                project_id=project_id,
                title=title,
                message=message,
                notification_type=notif_type,
            )
            await self._create_activity(
                project_id=project_id,
                user_id=project["user_id"],
                action="AI Analysis Completed",
                details={
                    "total_tokens": total_tokens,
                    "agents_completed": len(successful_agents),
                    "agents_failed": len(failed_agents),
                },
                icon="check-circle",
            )

            logger.info(
                "Agent pipeline completed",
                project_id=project_id,
                total_tokens=total_tokens,
                successful=successful_agents,
                failed=failed_agents,
            )
            return results

        except Exception as e:
            # Catch-all: mark project as failed
            logger.error(
                "Agent pipeline crashed",
                project_id=project_id,
                error=str(e),
                traceback=traceback.format_exc(),
            )
            self.supabase.table("projects").update({
                "status": "failed",
                "error_message": f"Pipeline error: {str(e)[:500]}",
                "current_agent": None,
            }).eq("id", project_id).execute()
            raise

    # ── Helpers ──────────────────────────────────────────────

    async def _create_agent_log(self, project_id: str, agent_name: str) -> dict:
        try:
            res = self.supabase.table("agent_logs").insert({
                "project_id": project_id,
                "agent_name": agent_name,
                "status": "running",
                "started_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
            return res.data[0] if res.data else {}
        except Exception as e:
            logger.error("Failed to create agent log", error=str(e))
            return {}

    async def _save_report(self, project_id: str, agent_key: str, data: dict):
        table_map = {
            "research":     "research_reports",
            "competitor":   "competitor_reports",
            "business_plan":"business_plans",
            "finance":      "financial_reports",
            "marketing":    "marketing_reports",
            "advertisement":"advertisements",
            "analytics":    "analytics_reports",
        }
        table = table_map.get(agent_key)
        if not table:
            return

        record = {
            "project_id": project_id,
            "status": "completed",
            "raw_data": data,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        # Analytics needs explicit score columns for dashboard queries
        if agent_key == "analytics":
            scores = data.get("scores", {})
            record.update({
                "health_score":             scores.get("health_score", 0),
                "market_opportunity_score": scores.get("market_opportunity_score", 0),
                "competition_score":        scores.get("competition_score", 0),
                "financial_health_score":   scores.get("financial_health_score", 0),
                "marketing_score":          scores.get("marketing_score", 0),
                "readiness_score":          scores.get("readiness_score", 0),
                "risk_score":               scores.get("risk_score", 0),
                "growth_score":             scores.get("growth_score", 0),
                "overall_score":            scores.get("overall_score", 0),
            })

        try:
            # Upsert: update if exists, insert if not
            existing = self.supabase.table(table).select("id").eq("project_id", project_id).execute()
            if existing.data:
                self.supabase.table(table).update(record).eq("project_id", project_id).execute()
            else:
                self.supabase.table(table).insert(record).execute()
            logger.info(f"Report saved: {table}", project_id=project_id)
        except Exception as e:
            logger.error(f"Failed to save report {table}", error=str(e), project_id=project_id)
            raise

    async def _create_notification(
        self, user_id: str, project_id: str, title: str, message: str, notification_type: str
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
        self, project_id: str, user_id: str, action: str, details: dict, icon: str = "activity"
    ):
        try:
            self.supabase.table("activity_timeline").insert({
                "project_id": project_id,
                "user_id": user_id,
                "action": action,
                "details": details,
                "icon": icon,
            }).execute()
        except Exception as e:
            logger.error("Failed to create activity", error=str(e))
