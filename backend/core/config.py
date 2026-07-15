from typing import List
from pydantic_settings import BaseSettings
from pydantic import model_validator
import os
import sys


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
    GEMINI_MODEL: str = "gemini-flash-latest"


    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-opus-4-5"

    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    TOGETHER_API_KEY: str = ""
    TOGETHER_MODEL: str = "meta-llama/Llama-3.3-70B-Instruct-Turbo"

    PRIMARY_AI_PROVIDER: str = "gemini"
    SECONDARY_AI_PROVIDER: str = "openai"
    AI_FALLBACK_ORDER: str = "groq,claude,together"

    # Frontend
    FRONTEND_URL: str = "http://localhost:5173"

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # File Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 10

    @model_validator(mode="after")
    def validate_required_env_vars(self) -> "Settings":
        """Fail fast with a clear developer error if critical env vars are missing."""
        missing_required = []

        if not self.SUPABASE_URL:
            missing_required.append("SUPABASE_URL")
        if not self.SUPABASE_PUBLISHABLE_KEY:
            missing_required.append("SUPABASE_PUBLISHABLE_KEY")
        if not self.SUPABASE_SECRET_KEY:
            missing_required.append("SUPABASE_SECRET_KEY")

        if missing_required:
            msg = (
                "\n" + "=" * 60 + "\n"
                "  STARTUP ERROR: Missing required environment variables\n"
                + "=" * 60 + "\n"
                f"  Missing: {', '.join(missing_required)}\n\n"
                "  Create backend/.env from the template:\n"
                "    cp backend/.env.example backend/.env\n\n"
                "  Then fill in your Supabase credentials:\n"
                "    SUPABASE_URL=https://your-project.supabase.co\n"
                "    SUPABASE_PUBLISHABLE_KEY=sb_publishable_...\n"
                "    SUPABASE_SECRET_KEY=sb_secret_...\n"
                + "=" * 60 + "\n"
            )
            # Print to BOTH stdout and stderr so it's always visible
            print(msg, flush=True)
            print(msg, file=sys.stderr, flush=True)
            raise ValueError(
                f"Missing required environment variables: {', '.join(missing_required)}. "
                "Check your backend/.env file."
            )

        # Warn (don't crash) if no AI provider is configured
        has_ai_key = any([
            self.GEMINI_API_KEY,
            self.OPENAI_API_KEY,
            self.ANTHROPIC_API_KEY,
            self.GROQ_API_KEY,
            self.TOGETHER_API_KEY,
        ])
        if not has_ai_key:
            warning = (
                "\n" + "-" * 60 + "\n"
                "  WARNING: No AI provider API key is configured.\n"
                "     AI analysis will not work until you add at least one:\n"
                "       GEMINI_API_KEY=   (recommended - get free key at aistudio.google.com)\n"
                "       OPENAI_API_KEY=\n"
                + "-" * 60 + "\n"
            )
            print(warning, flush=True)

        return self

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    @property
    def ai_fallback_list(self) -> List[str]:
        fallbacks = []
        if self.PRIMARY_AI_PROVIDER:
            fallbacks.append(self.PRIMARY_AI_PROVIDER.strip())
        if self.SECONDARY_AI_PROVIDER:
            fallbacks.append(self.SECONDARY_AI_PROVIDER.strip())
        for p in self.AI_FALLBACK_ORDER.split(","):
            p = p.strip()
            if p and p not in fallbacks:
                fallbacks.append(p)
        return fallbacks

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
        case_sensitive = True
        extra = "ignore"


settings = Settings()
