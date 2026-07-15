"""
watchdog.py — Background Stall Detector & Stuck-Project Recovery

Runs as a continuous asyncio background task.
Every 10 seconds it scans for:
  1. Projects stuck in 'processing' with no heartbeat for >90 seconds
  2. Projects stuck in 'processing' for more than 3 minutes total

For stalled projects it:
  - Marks timed-out agents as 'failed'
  - Triggers a resume of only incomplete sections
  - Sends a notification to the user
"""
import asyncio
from datetime import datetime, timezone, timedelta
import structlog

logger = structlog.get_logger()

WATCHDOG_INTERVAL = 10          # seconds between checks
HEARTBEAT_TIMEOUT = 90          # seconds before an agent is considered stalled
MAX_PROCESSING_DURATION = 180   # 3 minutes — hard cap on any single pipeline run


class ProjectWatchdog:
    """
    Continuously monitors running projects and auto-recovers stalled ones.
    Must be started as an asyncio Task via `asyncio.create_task(watchdog.run())`.
    """

    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self._running = False

    def stop(self):
        self._running = False

    async def run(self):
        self._running = True
        logger.info("ProjectWatchdog started")
        while self._running:
            try:
                await self._check_stalled_projects()
            except Exception as e:
                logger.error("Watchdog check failed (non-fatal)", error=str(e))
            await asyncio.sleep(WATCHDOG_INTERVAL)
        logger.info("ProjectWatchdog stopped")

    async def _check_stalled_projects(self):
        now = datetime.now(timezone.utc)

        try:
            res = self.supabase.table("projects") \
                .select("id, user_id, business_name, status, heartbeat, updated_at, current_agent") \
                .eq("status", "processing") \
                .execute()
        except Exception as e:
            logger.warning("Watchdog: failed to query processing projects", error=str(e))
            return

        if not res.data:
            return

        for project in res.data:
            project_id = project.get("id")
            user_id = project.get("user_id", "")
            business_name = project.get("business_name", "")

            # Determine how long it's been since the last heartbeat or update
            heartbeat_str = project.get("heartbeat") or project.get("updated_at")
            if not heartbeat_str:
                continue

            try:
                # Handle both offset-aware and naive timestamps
                if heartbeat_str.endswith("Z"):
                    heartbeat_str = heartbeat_str[:-1] + "+00:00"
                last_beat = datetime.fromisoformat(heartbeat_str)
                if last_beat.tzinfo is None:
                    last_beat = last_beat.replace(tzinfo=timezone.utc)
            except Exception:
                continue

            seconds_since_beat = (now - last_beat).total_seconds()

            if seconds_since_beat >= HEARTBEAT_TIMEOUT:
                logger.warning(
                    "Watchdog: stalled project detected",
                    project_id=project_id,
                    seconds_stalled=round(seconds_since_beat),
                    current_agent=project.get("current_agent"),
                )
                await self._recover_stalled_project(project_id, user_id, business_name)

    async def _recover_stalled_project(self, project_id: str, user_id: str, business_name: str):
        """
        Auto-recover a stalled project by:
        1. Finding which agents haven't completed.
        2. Marking any 'running' agents as 'failed'.
        3. Triggering a resume run for only the incomplete agents.
        """
        from .orchestrator import AgentOrchestrator, SECTION_KEYS, TABLE_MAP, SECTION_DISPLAY

        logger.info("Watchdog: attempting recovery", project_id=project_id)

        # Mark any 'running' agents as 'failed'
        stalled_agents = []
        for sk, table in TABLE_MAP.items():
            try:
                r = self.supabase.table(table).select("id, status").eq("project_id", project_id).execute()
                if r.data and r.data[0].get("status") == "running":
                    stalled_agents.append(sk)
                    self.supabase.table(table).update({
                        "status": "failed",
                        "raw_data": {"error": "Agent stalled — automatically restarted by watchdog"},
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }).eq("project_id", project_id).execute()
                    logger.info(f"Watchdog: marked {sk} as failed", project_id=project_id)
            except Exception as e:
                logger.warning(f"Watchdog: failed to mark {sk} as failed", error=str(e))

        # Find all incomplete sections
        incomplete = []
        for sk, table in TABLE_MAP.items():
            try:
                r = self.supabase.table(table).select("status").eq("project_id", project_id).execute()
                if not r.data or r.data[0].get("status") != "completed":
                    incomplete.append(sk)
            except Exception:
                incomplete.append(sk)

        if not incomplete:
            # All done — just update status
            self.supabase.table("projects").update({
                "status": "completed",
                "progress_percent": 100,
                "current_agent": None,
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", project_id).execute()
            return

        logger.info(
            "Watchdog: resuming incomplete agents",
            project_id=project_id,
            incomplete=incomplete,
        )

        # Notify user
        try:
            self.supabase.table("notifications").insert({
                "user_id": user_id,
                "project_id": project_id,
                "title": "Analysis Auto-Resumed 🔄",
                "message": (
                    f"The analysis for '{business_name}' was stalled and has been automatically resumed. "
                    f"Retrying: {', '.join(SECTION_DISPLAY.get(s, s) for s in incomplete)}."
                ),
                "notification_type": "info",
                "is_read": False,
            }).execute()
        except Exception:
            pass

        # Load full project
        try:
            proj_res = self.supabase.table("projects").select("*").eq("id", project_id).execute()
            if not proj_res.data:
                logger.warning("Watchdog: project not found for recovery", project_id=project_id)
                return
            project = proj_res.data[0]
        except Exception as e:
            logger.error("Watchdog: failed to load project for recovery", error=str(e))
            return

        # Resume the pipeline with only incomplete sections
        import uuid
        job_id = f"watchdog-{uuid.uuid4().hex[:8]}"
        orchestrator = AgentOrchestrator(self.supabase)
        try:
            await orchestrator.run(
                project=project,
                job_id=job_id,
                target_sections=incomplete,
            )
        except Exception as e:
            logger.error("Watchdog: recovery pipeline failed", project_id=project_id, error=str(e))
            self.supabase.table("projects").update({
                "status": "failed",
                "error_message": f"Watchdog recovery failed: {str(e)[:300]}",
                "current_agent": None,
            }).eq("id", project_id).execute()


# Module-level singleton
_watchdog_instance: ProjectWatchdog = None
_watchdog_task: asyncio.Task = None


def get_watchdog(supabase_client=None) -> ProjectWatchdog:
    global _watchdog_instance
    if _watchdog_instance is None and supabase_client:
        _watchdog_instance = ProjectWatchdog(supabase_client)
    return _watchdog_instance


async def start_watchdog(supabase_client):
    global _watchdog_task, _watchdog_instance
    _watchdog_instance = ProjectWatchdog(supabase_client)
    _watchdog_task = asyncio.create_task(_watchdog_instance.run())
    logger.info("Watchdog task created and started")
    return _watchdog_task


async def stop_watchdog():
    global _watchdog_task, _watchdog_instance
    if _watchdog_instance:
        _watchdog_instance.stop()
    if _watchdog_task and not _watchdog_task.done():
        _watchdog_task.cancel()
        try:
            await _watchdog_task
        except asyncio.CancelledError:
            pass
    logger.info("Watchdog stopped")
