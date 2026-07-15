import asyncio
import sys
from typing import Optional, List, Dict
import structlog
from enum import Enum

from .base_provider import BaseAIProvider
from .models import AIResponse, ErrorType
from .gemini_provider import GeminiProvider
from .providers import OpenAIProvider, ClaudeProvider, GroqProvider, TogetherProvider
from ...core.config import settings
from ...core.exceptions import AIServiceException

logger = structlog.get_logger()


class ProviderState(Enum):
    HEALTHY = "HEALTHY"
    RATE_LIMITED = "RATE_LIMITED"
    QUOTA_EXHAUSTED = "QUOTA_EXHAUSTED"
    UNAVAILABLE = "UNAVAILABLE"
    RETRYING = "RETRYING"


class AIService:
    """
    Central AI Service Layer - Provider Independent Architecture
    
    ALL agents MUST communicate ONLY through this service.
    No agent can directly call a provider.
    
    Features:
    - Multi-provider support with Provider Health Management
    - Round Robin Load Balancing among healthy providers
    - Automatic Failover on quota/rate limit/timeout
    - Retry with exponential backoff
    - Unified response format
    - Token tracking and logging
    """

    def __init__(self):
        self._providers: Dict[str, BaseAIProvider] = {}
        self._provider_states: Dict[str, ProviderState] = {}
        self._primary_provider: Optional[str] = settings.PRIMARY_AI_PROVIDER
        self._secondary_provider: Optional[str] = getattr(settings, 'SECONDARY_AI_PROVIDER', None)
        self._fallback_order: List[str] = settings.ai_fallback_list
        self._initialized = False
        self._round_robin_index = 0

    async def _initialize_providers(self):
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
                if await provider.is_available():
                    self._provider_states[name] = ProviderState.HEALTHY
                    logger.info(f"Registered AI provider: {name} (HEALTHY)")
                else:
                    self._provider_states[name] = ProviderState.UNAVAILABLE
                    logger.info(f"Registered AI provider: {name} (UNAVAILABLE - missing config/key)")
            except Exception as e:
                self._provider_states[name] = ProviderState.UNAVAILABLE
                logger.warning(f"Failed to register {name}", error=str(e))

        self._initialized = True

    def register_provider(self, provider: BaseAIProvider, state: ProviderState = ProviderState.HEALTHY):
        """Register a custom or user-provided provider"""
        self._providers[provider.provider_name] = provider
        self._provider_states[provider.provider_name] = state

    def set_primary_provider(self, provider_name: str):
        """Switch the primary provider at runtime"""
        if provider_name not in self._providers:
            raise ValueError(f"Provider '{provider_name}' is not registered")
        self._primary_provider = provider_name
        logger.info(f"Primary AI provider switched to: {provider_name}")

    def get_available_providers(self) -> List[str]:
        """Return a list of provider names that are currently HEALTHY."""
        return [name for name, state in self._provider_states.items() if state == ProviderState.HEALTHY]

    def _get_ordered_providers(self, preferred_provider: Optional[str] = None) -> List[str]:
        """Get providers ordered by preference, health, and load balancing"""
        ordered = []
        
        # 1. Preferred provider if healthy
        if preferred_provider and self._provider_states.get(preferred_provider) == ProviderState.HEALTHY:
            ordered.append(preferred_provider)
            
        # 2. Get all other healthy providers in fallback order
        healthy_fallbacks = []
        for p in self._fallback_order:
            if p not in ordered and self._provider_states.get(p) == ProviderState.HEALTHY:
                healthy_fallbacks.append(p)
                
        # 3. Apply round robin to the healthy fallbacks
        if healthy_fallbacks:
            n = len(healthy_fallbacks)
            idx = self._round_robin_index % n
            self._round_robin_index += 1
            # Shift list so it starts from idx
            rotated = healthy_fallbacks[idx:] + healthy_fallbacks[:idx]
            ordered.extend(rotated)
            
        # 4. Append providers that are Rate Limited or Retrying (might recover)
        for p in self._fallback_order:
            state = self._provider_states.get(p)
            if p not in ordered and state in (ProviderState.RATE_LIMITED, ProviderState.RETRYING):
                ordered.append(p)
                
        return ordered

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
        Generate AI response with automatic fallback and health tracking.
        """
        if not self._initialized:
            await self._initialize_providers()

        ordered_providers = self._get_ordered_providers(preferred_provider)

        if not ordered_providers:
            # Fallback: if all providers are marked rate-limited/exhausted, try any configured provider anyway
            ordered_providers = [name for name in self._fallback_order if name in self._providers and self._providers[name]._api_key]

        if not ordered_providers:
            raise AIServiceException("No AI providers are currently healthy or configured.")

        diagnostics = {
            "configured_providers": self.get_available_providers(),
            "attempts": []
        }

        last_error = None
        for provider_name in ordered_providers:
            provider = self._providers.get(provider_name)
            if provider is None:
                continue
            
            current_max_retries = 1 if provider_name == "gemini" else (2 if provider_name == "openai" else max_retries)

            for attempt in range(current_max_retries + 1):
                try:
                    logger.info(
                        f"Attempting generation",
                        provider=provider_name,
                        attempt=attempt + 1,
                        state=self._provider_states[provider_name].value
                    )
                    
                    self._provider_states[provider_name] = ProviderState.RETRYING if attempt > 0 else self._provider_states[provider_name]

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
                        # Mark healthy on success
                        self._provider_states[provider_name] = ProviderState.HEALTHY
                        logger.info(
                            "AI generation successful",
                            provider=provider_name,
                            tokens=response.tokens_used,
                            latency_ms=response.latency_ms,
                            prompt_preview=prompt[:200],
                            response_preview=response.content[:200]
                        )
                        response.metadata["diagnostics"] = diagnostics
                        return response

                    last_error = response.error
                    error_type = getattr(response, 'error_type', None)
                    
                    logger.warning(
                        f"Provider {provider_name} returned empty/failed response",
                        error=last_error,
                        error_type=error_type.value if error_type else "UNKNOWN",
                        attempt=attempt + 1,
                    )
                    
                    if error_type == ErrorType.UNAUTHORIZED:
                        # App bug or invalid key - do not retry on this provider, failover immediately
                        logger.warning(f"Provider {provider_name} unauthorized. Failing over immediately.")
                        self._provider_states[provider_name] = ProviderState.UNAVAILABLE
                        break
                    elif error_type == ErrorType.RATE_LIMIT:
                        self._provider_states[provider_name] = ProviderState.RATE_LIMITED
                        if attempt < current_max_retries:
                            wait = 10
                            logger.info(f"Provider {provider_name} rate limited. Waiting {wait}s before retry.")
                            await asyncio.sleep(wait)
                            continue
                        else:
                            # Final rate limit hit, mark as quota exhausted for this run and failover
                            logger.warning(f"Provider {provider_name} rate limited on final attempt. Failing over.")
                            self._provider_states[provider_name] = ProviderState.QUOTA_EXHAUSTED
                            break
                    elif error_type in (ErrorType.TIMEOUT, ErrorType.SERVER_ERROR):
                        if attempt >= current_max_retries:
                            logger.warning(f"Provider {provider_name} persistent server error/timeout. Failing over.")
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

                if attempt < current_max_retries:
                    wait_seconds = 2 ** attempt  # exponential backoff
                    await asyncio.sleep(wait_seconds)

            logger.warning(f"Provider {provider_name} exhausted all retries or failed over, trying next provider", fallback_reason=last_error)

        # All providers failed
        raise AIServiceException(f"All AI providers failed. Last error: {last_error}")

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
        brace_start = content.find("{")
        if brace_start > 0:
            content = content[brace_start:]
        brace_end = content.rfind("}")
        if brace_end != -1 and brace_end < len(content) - 1:
            content = content[:brace_end + 1]

        try:
            parsed = json.loads(content)
            logger.info("JSON successfully parsed natively", provider=response.provider)
            return response, parsed
        except json.JSONDecodeError as je:
            try:
                import json_repair
                logger.info("Native JSON parse failed, attempting json_repair", provider=response.provider, error=str(je))
                parsed = json_repair.repair_json(content, return_objects=True)
                if parsed and isinstance(parsed, dict):
                    logger.info("JSON successfully extracted and repaired via json_repair", provider=response.provider)
                    return response, parsed
                else:
                    logger.warning("json_repair did not return a valid dictionary, returned type: " + str(type(parsed)), provider=response.provider)
                    raise ValueError("json_repair did not return a valid dictionary")
            except Exception as repair_e:
                logger.warning("json_repair threw an exception", provider=response.provider, error=str(repair_e))
                json_match = re.search(r'\{[\s\S]*\}', content)
                if json_match:
                    try:
                        parsed = json_repair.repair_json(json_match.group(), return_objects=True) if 'json_repair' in sys.modules else json.loads(json_match.group())
                        if parsed and isinstance(parsed, dict):
                            logger.info("JSON extracted via regex fallback and repaired", provider=response.provider)
                            return response, parsed
                    except Exception as regex_e:
                        logger.warning("Regex fallback failed", provider=response.provider, error=str(regex_e))
                
                logger.error(
                    "Failed to parse JSON from AI response",
                    parse_error=str(je),
                    repair_error=str(repair_e),
                    provider=response.provider,
                    content_preview=content[:500].encode('ascii', 'replace').decode('ascii'),
                )
            raise AIServiceException(
                f"AI ({response.provider}) returned invalid JSON: {str(je)[:120]}. "
                "The model did not follow the JSON format instruction."
            )


# Global singleton
ai_service = AIService()
