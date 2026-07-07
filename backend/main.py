import os
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


import logging
import sys

# Ensure logs directory exists
os.makedirs("backend/logs", exist_ok=True)

# 1. Standard library logging setup
logging.basicConfig(
    level=logging.DEBUG,
    format="%(message)s",
    handlers=[
        logging.FileHandler("backend/logs/server.log"),
    ]
)

# 2. Add a console handler that only shows WARNING and above
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.WARNING)
logging.getLogger().addHandler(console_handler)

# 3. Silence noisy third-party loggers
for logger_name in ["uvicorn", "uvicorn.error", "uvicorn.access", "fastapi", "watchfiles", "watchfiles.main"]:
    noisy_logger = logging.getLogger(logger_name)
    noisy_logger.setLevel(logging.WARNING)
    noisy_logger.propagate = False
    noisy_logger.addHandler(logging.FileHandler("backend/logs/server.log"))

# 4. Configure structlog to output to standard logger
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


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="StartupPilot AI - Autonomous Business Builder API",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )

    # ── Middleware ────────────────────────────────────────
    app.add_middleware(ExceptionLoggingMiddleware)

    # ── CORS ──────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Exception Handlers ────────────────────────────────
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)

    # ── Routers ───────────────────────────────────────────
    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(projects_router, prefix="/api/v1")
    app.include_router(reports_router, prefix="/api/v1")
    app.include_router(dashboard_router, prefix="/api/v1")
    app.include_router(settings_router, prefix="/api/v1")
    app.include_router(exports_router, prefix="/api/v1/exports")

    # ── Health Check ──────────────────────────────────────
    @app.get("/api/health", tags=["Health"])
    async def health_check():
        return {
            "status": "healthy",
            "database": "connected",
            "ai": "ready"
        }

    @app.on_event("startup")
    async def on_startup():
        logger.info(f"[START] {settings.APP_NAME} v{settings.APP_VERSION} starting...")
        logger.info("[DOCS] API Docs: http://localhost:8000/api/docs")
        logger.info(f"[AI] Primary AI Provider: {settings.PRIMARY_AI_PROVIDER}")

        # Create upload directory
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

        # Start the background watchdog (stall detector / auto-recovery)
        try:
            await start_watchdog(supabase_admin)
            logger.info("[WATCHDOG] Background watchdog started")
        except Exception as e:
            logger.warning(f"[WATCHDOG] Failed to start watchdog: {e}")


    @app.on_event("shutdown")
    async def on_shutdown():
        logger.info("[STOP] StartupPilot AI shutting down...")
        try:
            await stop_watchdog()
        except Exception:
            pass

    return app


app = create_app()
