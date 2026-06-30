from dataclasses import dataclass, field
from typing import Optional, Dict, Any
from datetime import datetime

from enum import Enum

class ErrorType(Enum):
    RATE_LIMIT = "RATE_LIMIT"
    UNAUTHORIZED = "UNAUTHORIZED"
    SERVER_ERROR = "SERVER_ERROR"
    TIMEOUT = "TIMEOUT"
    UNKNOWN = "UNKNOWN"

@dataclass
class AIResponse:
    content: str
    model: str
    provider: str
    tokens_used: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    latency_ms: float = 0.0
    success: bool = True
    error: Optional[str] = None
    error_type: Optional[ErrorType] = None
    raw_response: Optional[Any] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.utcnow)
