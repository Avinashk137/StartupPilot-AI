import os
import contextlib
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


# Configure structured logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.dev.ConsoleRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(20),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
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

    # ── Health Check ──────────────────────────────────────
    @app.get("/api/health", tags=["Health"])
    async def health_check():
        return {
            "status": "healthy",
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "env": settings.APP_ENV,
        }

    @app.on_event("startup")
    async def on_startup():
        logger.info(f"[START] {settings.APP_NAME} v{settings.APP_VERSION} starting...")
        logger.info("[DOCS] API Docs: http://localhost:8000/api/docs")
        logger.info(f"[AI] Primary AI Provider: {settings.PRIMARY_AI_PROVIDER}")

        # Create upload directory
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)




    @app.on_event("shutdown")
    async def on_shutdown():
        logger.info("[STOP] StartupPilot AI shutting down...")

    return app


app = create_app()
