from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
import traceback
import structlog

logger = structlog.get_logger()

class ExceptionLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as e:
            logger.error(f"Unhandled exception during {request.method} {request.url.path}: {e}")
            logger.error(traceback.format_exc())
            # Write to a file so we can see it
            with open("backend_exception.log", "a") as f:
                f.write(f"{request.method} {request.url.path}\n{traceback.format_exc()}\n")
            raise e
