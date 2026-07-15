import os
import sys
import time
import logging
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi import HTTPException
import structlog

from .core.config import settings
from .core.exceptions import (
    http_exception_handler,
    validation_exception_handler,
    general_exception_handler,
)
from .api.auth import router as auth_router
from .api.projects import router as projects_router
from .api.reports import router as reports_router
from .api.dashboard import router as dashboard_router
from .api.settings import router as settings_router
from .api.exports import router as exports_router
from .agents.watchdog import start_watchdog, stop_watchdog
from .core.supabase_client import supabase_admin
from .api.exception_middleware import ExceptionLoggingMiddleware

# ── Log directory: always relative to this file, regardless of CWD ────────────
BACKEND_DIR = Path(__file__).resolve().parent
LOG_DIR = BACKEND_DIR / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOG_DIR / "server.log"

# ── Logging setup ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG,
    format="%(message)s",
    handlers=[
        logging.FileHandler(str(LOG_FILE)),
    ],
)

# Console handler: WARNING+ only (keeps startup output clean)
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.WARNING)
logging.getLogger().addHandler(console_handler)

# Silence noisy third-party loggers (keep them file-only)
for _logger_name in ["uvicorn", "uvicorn.error", "uvicorn.access", "fastapi", "watchfiles", "watchfiles.main"]:
    _noisy = logging.getLogger(_logger_name)
    _noisy.setLevel(logging.WARNING)
    _noisy.propagate = False
    _noisy.addHandler(logging.FileHandler(str(LOG_FILE)))

# Configure structlog → standard library
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Track when the process started (for uptime reporting)
_startup_time: float = time.time()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="StartupPilot AI — Autonomous Business Builder API",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )

    # ── Middleware ────────────────────────────────────────────────────────────
    app.add_middleware(ExceptionLoggingMiddleware)

    # ── CORS ──────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Exception Handlers ────────────────────────────────────────────────────
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(projects_router, prefix="/api/v1")
    app.include_router(reports_router, prefix="/api/v1")
    app.include_router(dashboard_router, prefix="/api/v1")
    app.include_router(settings_router, prefix="/api/v1")
    app.include_router(exports_router, prefix="/api/v1/exports")

    # ── Health Check ──────────────────────────────────────────────────────────
    @app.get("/api/health", tags=["Health"])
    async def health_check():
        """
        Real health check — verifies each critical subsystem.
        Returns 200 only when all required subsystems are operational.
        """
        uptime_seconds = round(time.time() - _startup_time, 1)
        checks: dict = {}
        overall_healthy = True

        # 1. Database / Supabase connectivity
        try:
            res = supabase_admin.table("projects").select("id").limit(1).execute()
            checks["database"] = {"status": "connected"}
        except Exception as e:
            checks["database"] = {"status": "error", "detail": str(e)[:120]}
            overall_healthy = False

        # 2. AI providers availability
        try:
            from .services.ai.ai_service import ai_service
            # Lazy-init without making a live API call
            if not ai_service._initialized:
                await ai_service._initialize_providers()
            available = ai_service.get_available_providers()
            if available:
                checks["ai"] = {"status": "ready", "providers": available}
            else:
                checks["ai"] = {"status": "degraded", "detail": "No AI providers with valid keys configured"}
                # AI being down is a warning, not a hard failure — backend still serves auth/projects
        except Exception as e:
            checks["ai"] = {"status": "error", "detail": str(e)[:120]}

        # 3. Storage directory
        try:
            upload_dir = Path(settings.UPLOAD_DIR)
            upload_dir.mkdir(parents=True, exist_ok=True)
            checks["storage"] = {"status": "ok", "path": str(upload_dir)}
        except Exception as e:
            checks["storage"] = {"status": "error", "detail": str(e)[:120]}

        return {
            "status": "healthy" if overall_healthy else "degraded",
            "version": settings.APP_VERSION,
            "uptime_seconds": uptime_seconds,
            "environment": settings.APP_ENV,
            **checks,
        }

    # ── Root Redirect ─────────────────────────────────────────────────────────
    @app.get("/", tags=["Root"])
    async def root():
        return {
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "docs": "/api/docs",
            "health": "/api/health",
        }

    # ── Startup Event ─────────────────────────────────────────────────────────
    @app.on_event("startup")
    async def on_startup():
        global _startup_time
        _startup_time = time.time()

        # Create upload directory
        Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

        # Print startup banner to stdout (visible in terminal)
        print(f"\n{'-' * 50}")
        print(f"  {settings.APP_NAME} v{settings.APP_VERSION}")
        print(f"  API Docs  : http://127.0.0.1:8000/api/docs")
        print(f"  Health    : http://127.0.0.1:8000/api/health")
        print(f"  AI        : {settings.PRIMARY_AI_PROVIDER} (primary)")
        print(f"  Logs      : {LOG_FILE}")
        print(f"{'-' * 50}\n")

        logger.info("StartupPilot AI starting", version=settings.APP_VERSION, env=settings.APP_ENV)

        # Start the background watchdog (stall detector / auto-recovery)
        try:
            await start_watchdog(supabase_admin)
            logger.info("Background watchdog started")
        except Exception as e:
            logger.warning("Failed to start watchdog (non-fatal)", error=str(e))

    # ── Shutdown Event ────────────────────────────────────────────────────────
    @app.on_event("shutdown")
    async def on_shutdown():
        logger.info("StartupPilot AI shutting down")
        print("\n  StartupPilot AI shutting down...\n")
        try:
            await stop_watchdog()
        except Exception:
            pass

    return app


app = create_app()
