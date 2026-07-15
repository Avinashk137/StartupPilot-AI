from pathlib import Path
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
import traceback
import structlog

logger = structlog.get_logger()

# Log file is always relative to the backend package directory
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_LOG_FILE = _BACKEND_DIR / "logs" / "server.log"


class ExceptionLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as e:
            tb = traceback.format_exc()
            logger.error(
                "Unhandled exception",
                method=request.method,
                path=request.url.path,
                error=str(e),
                traceback=tb,
            )
            # Append to the server log (same file, consistent location)
            try:
                _LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
                with open(str(_LOG_FILE), "a") as f:
                    f.write(f"\n[EXCEPTION] {request.method} {request.url.path}\n{tb}\n")
            except Exception:
                pass  # If we can't write the log, don't compound the error
            raise e
