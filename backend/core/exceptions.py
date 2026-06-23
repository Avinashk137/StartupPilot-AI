from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import structlog

logger = structlog.get_logger()


class StartupPilotException(HTTPException):
    """Base exception for StartupPilot AI"""
    pass


class NotFoundException(StartupPilotException):
    def __init__(self, resource: str, resource_id: str = ""):
        detail = f"{resource} not found"
        if resource_id:
            detail = f"{resource} with id '{resource_id}' not found"
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class ForbiddenException(StartupPilotException):
    def __init__(self, message: str = "You do not have permission to perform this action"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=message)


class ConflictException(StartupPilotException):
    def __init__(self, message: str = "Resource already exists"):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=message)


class UnprocessableException(StartupPilotException):
    def __init__(self, message: str = "Unprocessable request"):
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=message)


class AIServiceException(Exception):
    """Raised when all AI providers fail"""
    def __init__(self, message: str = "All AI providers failed"):
        self.message = message
        super().__init__(message)


async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": exc.detail, "status_code": exc.status_code},
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"],
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"success": False, "error": "Validation error", "details": errors},
    )


async def general_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception", error=str(exc), path=request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"success": False, "error": "Internal server error"},
    )
