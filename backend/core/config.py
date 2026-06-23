from typing import Optional, List
from pydantic_settings import BaseSettings
from pydantic import field_validator
import os


class Settings(BaseSettings):
    # App
    APP_NAME: str = "StartupPilot AI"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # Security
    SECRET_KEY: str = "change-this-secret-key-in-production-minimum-32-characters"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    SUPABASE_URL: str = ""
    SUPABASE_PUBLISHABLE_KEY: str = ""
    SUPABASE_SECRET_KEY: str = ""
    SUPABASE_JWKS_URL: str = ""
    REDIS_URL: str = "redis://localhost:6379/0"

    # AI Providers
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-pro-latest"

    PRIMARY_AI_PROVIDER: str = "gemini"
    AI_FALLBACK_ORDER: str = "gemini"

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # File Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 10

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    @property
    def ai_fallback_list(self) -> List[str]:
        return [p.strip() for p in self.AI_FALLBACK_ORDER.split(",")]

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
        case_sensitive = True
        extra = "ignore"


settings = Settings()
