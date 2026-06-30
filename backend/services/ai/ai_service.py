import asyncio
import sys
from typing import Optional, List, Dict
import structlog

from .base_provider import BaseAIProvider
from .models import AIResponse, ErrorType
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
        max_tokens: int = 16384,
        preferred_provider: Optional[str] = None,
        max_retries: int = 2,
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

        diagnostics = {
            "configured_providers": self.get_available_providers(),
            "attempts": []
        }

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

                    diagnostics["attempts"].append({
                        "provider": provider_name,
                        "attempt": attempt + 1,
                        "success": response.success,
                        "error": response.error,
                        "error_type": response.error_type.value if getattr(response, 'error_type', None) else None,
                        "latency_ms": response.latency_ms
                    })

                    if response.success and response.content:
                        logger.info(
                            "AI generation successful",
                            provider=provider_name,
                            tokens=response.tokens_used,
                            latency_ms=response.latency_ms,
                        )
                        response.metadata["diagnostics"] = diagnostics
                        return response

                    last_error = response.error
                    logger.warning(
                        f"Provider {provider_name} returned empty/failed response",
                        error=last_error,
                        attempt=attempt + 1,
                    )
                    
                    error_type = getattr(response, 'error_type', None)
                    if error_type == ErrorType.UNAUTHORIZED:
                        logger.warning(f"Provider {provider_name} unauthorized. Failing over immediately.")
                        break
                    if error_type == ErrorType.RATE_LIMIT:
                        logger.warning(f"Provider {provider_name} rate limited. Failing over immediately.")
                        break

                except Exception as e:
                    last_error = str(e)
                    diagnostics["attempts"].append({
                        "provider": provider_name,
                        "attempt": attempt + 1,
                        "success": False,
                        "error": last_error,
                        "error_type": "UNKNOWN",
                        "latency_ms": 0
                    })
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
        max_tokens: int = 16384,
        preferred_provider: Optional[str] = None,
    ) -> tuple[AIResponse, dict]:
        """Generate and parse JSON response. Raises AIServiceException on parse failure."""
        import json
        import re

        json_system = (
            (system_prompt or "") +
            "\n\nCRITICAL INSTRUCTION: You MUST respond with ONLY a valid JSON object. "
            "Do NOT include markdown code fences (```), explanations, or any text outside the JSON. "
            "Start your response with { and end with }. No trailing text."
        )

        response = await self.generate(
            prompt=prompt,
            system_prompt=json_system,
            temperature=temperature,
            max_tokens=max_tokens,
            preferred_provider=preferred_provider,
        )

        content = response.content.strip()

        # Strip markdown code fences if present
        if content.startswith("```"):
            content = re.sub(r"```(?:json)?\s*", "", content)
            content = re.sub(r"```\s*$", "", content).strip()

        # Strip any leading/trailing non-JSON text
        # Find the outermost JSON object
        brace_start = content.find("{")
        if brace_start > 0:
            content = content[brace_start:]
        brace_end = content.rfind("}")
        if brace_end != -1 and brace_end < len(content) - 1:
            content = content[:brace_end + 1]

        try:
            parsed = json.loads(content)
            return response, parsed
        except json.JSONDecodeError as je:
            try:
                import json_repair
                parsed = json_repair.repair_json(content, return_objects=True)
                if parsed and isinstance(parsed, dict):
                    logger.warning("JSON extracted and repaired via json_repair", provider=response.provider)
                    return response, parsed
                else:
                    raise ValueError("json_repair did not return a valid dictionary")
            except Exception as repair_e:
                # Last-ditch: regex extract largest JSON block
                json_match = re.search(r'\{[\s\S]*\}', content)
                if json_match:
                    try:
                        parsed = json_repair.repair_json(json_match.group(), return_objects=True) if 'json_repair' in sys.modules else json.loads(json_match.group())
                        if parsed and isinstance(parsed, dict):
                            logger.warning("JSON extracted via regex fallback and repaired", provider=response.provider)
                            return response, parsed
                    except Exception:
                        pass
                logger.error(
                    "Failed to parse JSON from AI response",
                    parse_error=str(je),
                provider=response.provider,
                content_preview=content[:300].encode('ascii', 'replace').decode('ascii'),
            )
            raise AIServiceException(
                f"AI ({response.provider}) returned invalid JSON: {str(je)[:120]}. "
                "The model did not follow the JSON format instruction."
            )


# Global singleton
ai_service = AIService()
