import asyncio
from typing import Optional, List, Dict
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from .base_provider import BaseAIProvider
from .models import AIResponse
from .gemini_provider import GeminiProvider
from .providers import OpenAIProvider, ClaudeProvider, GroqProvider, TogetherProvider
from ...core.config import settings
from ...core.exceptions import AIServiceException

logger = structlog.get_logger()


class AIService:
    """
    Central AI Service Layer - Provider Independent Architecture
    
    ALL agents MUST communicate ONLY through this service.
    No agent can directly call a provider.
    
    Features:
    - Provider switching (manual or auto)
    - Automatic fallback chain
    - Retry with exponential backoff
    - Unified response format
    - Token tracking and logging
    """

    def __init__(self):
        self._providers: Dict[str, BaseAIProvider] = {}
        self._primary_provider: Optional[str] = settings.PRIMARY_AI_PROVIDER
        self._fallback_order: List[str] = settings.ai_fallback_list
        self._initialized = False

    def _initialize_providers(self):
        if self._initialized:
            return

        provider_map = {
            "gemini": GeminiProvider,
            "openai": OpenAIProvider,
            "claude": ClaudeProvider,
            "groq": GroqProvider,
            "together": TogetherProvider,
        }

        for name, ProviderClass in provider_map.items():
            try:
                provider = ProviderClass()
                self._providers[name] = provider
                logger.info(f"Registered AI provider: {name}")
            except Exception as e:
                logger.warning(f"Failed to register {name}", error=str(e))

        self._initialized = True

    def register_provider(self, provider: BaseAIProvider):
        """Register a custom or user-provided provider"""
        self._providers[provider.provider_name] = provider
        logger.info(f"Custom provider registered: {provider.provider_name}")

    def set_primary_provider(self, provider_name: str):
        """Switch the primary provider at runtime"""
        if provider_name not in self._providers:
            raise ValueError(f"Provider '{provider_name}' is not registered")
        self._primary_provider = provider_name
        logger.info(f"Primary AI provider switched to: {provider_name}")

    def get_available_providers(self) -> List[str]:
        self._initialize_providers()
        return list(self._providers.keys())

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 8192,
        preferred_provider: Optional[str] = None,
        max_retries: int = 3,
    ) -> AIResponse:
        """
        Generate AI response with automatic fallback.

        Tries providers in order: preferred → primary → fallback chain
        Retries each provider up to max_retries times on failure.
        """
        self._initialize_providers()

        # Build ordered provider list
        ordered_providers = []
        if preferred_provider and preferred_provider in self._providers:
            ordered_providers.append(preferred_provider)
        if self._primary_provider and self._primary_provider not in ordered_providers:
            ordered_providers.append(self._primary_provider)
        for p in self._fallback_order:
            if p not in ordered_providers and p in self._providers:
                ordered_providers.append(p)

        if not ordered_providers:
            raise AIServiceException("No AI providers configured. Please add at least one API key.")

        last_error = None
        for provider_name in ordered_providers:
            provider = self._providers.get(provider_name)
            if provider is None:
                continue

            if not await provider.is_available():
                logger.debug(f"Provider {provider_name} not available, skipping")
                continue

            for attempt in range(max_retries + 1):
                try:
                    logger.info(
                        f"Attempting generation",
                        provider=provider_name,
                        attempt=attempt + 1,
                    )
                    response = await provider.generate(
                        prompt=prompt,
                        system_prompt=system_prompt,
                        temperature=temperature,
                        max_tokens=max_tokens,
                    )

                    if response.success and response.content:
                        logger.info(
                            "AI generation successful",
                            provider=provider_name,
                            tokens=response.tokens_used,
                            latency_ms=response.latency_ms,
                        )
                        return response

                    last_error = response.error
                    logger.warning(
                        f"Provider {provider_name} returned empty/failed response",
                        error=last_error,
                        attempt=attempt + 1,
                    )

                except Exception as e:
                    last_error = str(e)
                    logger.error(
                        f"Provider {provider_name} threw exception",
                        error=last_error,
                        attempt=attempt + 1,
                    )

                if attempt < max_retries:
                    wait_seconds = 2 ** attempt  # exponential backoff
                    await asyncio.sleep(wait_seconds)

            logger.warning(f"Provider {provider_name} exhausted all retries, trying next")

        # All providers failed
        raise AIServiceException(last_error or "Unknown AI provider error.")

    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 8192,
        preferred_provider: Optional[str] = None,
    ) -> tuple[AIResponse, dict]:
        """Generate and parse JSON response"""
        import json
        import re

        json_system = (system_prompt or "") + "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no explanations, no code blocks. Just the raw JSON object."

        response = await self.generate(
            prompt=prompt,
            system_prompt=json_system,
            temperature=temperature,
            max_tokens=max_tokens,
            preferred_provider=preferred_provider,
        )

        content = response.content.strip()

        # Clean up common AI JSON formatting issues
        if content.startswith("```"):
            content = re.sub(r"```(?:json)?\n?", "", content).rstrip("`").strip()

        try:
            parsed = json.loads(content)
            return response, parsed
        except json.JSONDecodeError:
            # Try to extract JSON from the response
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                try:
                    parsed = json.loads(json_match.group())
                    return response, parsed
                except json.JSONDecodeError:
                    pass
            logger.error("Failed to parse JSON from AI response", content=content[:500])
            return response, {}


# Global singleton
ai_service = AIService()
