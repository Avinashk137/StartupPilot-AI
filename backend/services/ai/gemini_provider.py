import asyncio
import time
from typing import Optional
import structlog
from .base_provider import BaseAIProvider
from .models import AIResponse
from ...core.config import settings

logger = structlog.get_logger()


class GeminiProvider(BaseAIProvider):
    """Google Gemini AI Provider — async-safe via asyncio.to_thread"""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self._api_key = api_key or settings.GEMINI_API_KEY
        self._model = model or settings.GEMINI_MODEL
        self._client = None
        self._initialized = False

    @property
    def provider_name(self) -> str:
        return "gemini"

    @property
    def model_name(self) -> str:
        return self._model

    def _get_client(self):
        if not self._initialized and self._api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self._api_key)
                self._client = genai.GenerativeModel(self._model)
                self._initialized = True
                logger.info("GeminiProvider initialized", model=self._model)
            except Exception as e:
                logger.error("GeminiProvider: Failed to initialize", error=str(e))
        return self._client

    def _sync_generate(self, full_prompt: str, generation_config) -> tuple:
        """Synchronous Gemini call — must be run via asyncio.to_thread"""
        import google.generativeai as genai
        client = self._get_client()
        if client is None:
            raise RuntimeError("Gemini client not initialized — check API key")

        response = client.generate_content(
            full_prompt,
            generation_config=generation_config,
        )
        content = response.text if response.text else ""
        tokens_used = 0
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            tokens_used = (
                (response.usage_metadata.prompt_token_count or 0) +
                (response.usage_metadata.candidates_token_count or 0)
            )
        return content, tokens_used

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 8192,
    ) -> AIResponse:
        start = time.time()
        try:
            client = self._get_client()
            if client is None:
                return AIResponse(
                    content="", model=self._model, provider=self.provider_name,
                    success=False, error="Gemini not configured — missing API key"
                )

            import google.generativeai as genai
            generation_config = genai.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            )

            full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt

            # CRITICAL FIX: Run synchronous Gemini SDK in a thread pool
            # to avoid blocking the async event loop (was the #1 cause of failures)
            content, tokens_used = await asyncio.to_thread(
                self._sync_generate, full_prompt, generation_config
            )

            latency = (time.time() - start) * 1000
            logger.info(
                "Gemini generation complete",
                tokens=tokens_used,
                latency_ms=round(latency),
                model=self._model,
            )
            return AIResponse(
                content=content,
                model=self._model,
                provider=self.provider_name,
                tokens_used=tokens_used,
                latency_ms=latency,
                success=True,
            )
        except Exception as e:
            latency = (time.time() - start) * 1000
            err_str = str(e)
            
            # Clean up known Gemini errors
            if "429" in err_str and "quota" in err_str.lower():
                err_msg = "Gemini API quota exceeded."
            elif "API_KEY_INVALID" in err_str or "API key not valid" in err_str or "API key missing" in err_str:
                err_msg = "Gemini API key missing or invalid."
            elif "timeout" in err_str.lower():
                err_msg = "Gemini API timeout."
            else:
                err_msg = err_str.split("\n")[0]
                if len(err_msg) > 100:
                    err_msg = err_msg[:100] + "..."

            logger.error("Gemini generation failed", error=err_msg, full_error=err_str)
            return AIResponse(
                content="", model=self._model, provider=self.provider_name,
                latency_ms=latency, success=False, error=err_msg
            )

    async def is_available(self) -> bool:
        return bool(self._api_key)
