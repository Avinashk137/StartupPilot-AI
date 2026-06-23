import time
from typing import Optional
import structlog
from .base_provider import BaseAIProvider
from .models import AIResponse
from ...core.config import settings

logger = structlog.get_logger()


class OpenAIProvider(BaseAIProvider):
    """OpenAI GPT Provider"""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self._api_key = api_key or settings.OPENAI_API_KEY
        self._model = model or settings.OPENAI_MODEL
        self._client = None

    @property
    def provider_name(self) -> str:
        return "openai"

    @property
    def model_name(self) -> str:
        return self._model

    def _get_client(self):
        if self._client is None and self._api_key:
            try:
                from openai import AsyncOpenAI
                self._client = AsyncOpenAI(api_key=self._api_key)
            except Exception as e:
                logger.warning("OpenAIProvider: Failed to initialize", error=str(e))
        return self._client

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
                    success=False, error="OpenAI not configured"
                )

            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            response = await client.chat.completions.create(
                model=self._model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )

            latency = (time.time() - start) * 1000
            content = response.choices[0].message.content or ""
            tokens_used = response.usage.total_tokens if response.usage else 0

            logger.info("OpenAI generation complete", tokens=tokens_used, latency_ms=latency)
            return AIResponse(
                content=content, model=self._model, provider=self.provider_name,
                tokens_used=tokens_used, latency_ms=latency, success=True,
                prompt_tokens=response.usage.prompt_tokens if response.usage else 0,
                completion_tokens=response.usage.completion_tokens if response.usage else 0,
            )
        except Exception as e:
            latency = (time.time() - start) * 1000
            logger.error("OpenAI generation failed", error=str(e))
            return AIResponse(
                content="", model=self._model, provider=self.provider_name,
                latency_ms=latency, success=False, error=str(e)
            )

    async def is_available(self) -> bool:
        return bool(self._api_key)


class ClaudeProvider(BaseAIProvider):
    """Anthropic Claude Provider"""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self._api_key = api_key or settings.ANTHROPIC_API_KEY
        self._model = model or settings.CLAUDE_MODEL
        self._client = None

    @property
    def provider_name(self) -> str:
        return "claude"

    @property
    def model_name(self) -> str:
        return self._model

    def _get_client(self):
        if self._client is None and self._api_key:
            try:
                import anthropic
                self._client = anthropic.AsyncAnthropic(api_key=self._api_key)
            except Exception as e:
                logger.warning("ClaudeProvider: Failed to initialize", error=str(e))
        return self._client

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
                    success=False, error="Claude not configured"
                )

            kwargs = {
                "model": self._model,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": [{"role": "user", "content": prompt}],
            }
            if system_prompt:
                kwargs["system"] = system_prompt

            response = await client.messages.create(**kwargs)

            latency = (time.time() - start) * 1000
            content = response.content[0].text if response.content else ""
            tokens_used = response.usage.input_tokens + response.usage.output_tokens

            logger.info("Claude generation complete", tokens=tokens_used, latency_ms=latency)
            return AIResponse(
                content=content, model=self._model, provider=self.provider_name,
                tokens_used=tokens_used, latency_ms=latency, success=True,
            )
        except Exception as e:
            latency = (time.time() - start) * 1000
            logger.error("Claude generation failed", error=str(e))
            return AIResponse(
                content="", model=self._model, provider=self.provider_name,
                latency_ms=latency, success=False, error=str(e)
            )

    async def is_available(self) -> bool:
        return bool(self._api_key)


class GroqProvider(BaseAIProvider):
    """Groq Fast Inference Provider"""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self._api_key = api_key or settings.GROQ_API_KEY
        self._model = model or settings.GROQ_MODEL
        self._client = None

    @property
    def provider_name(self) -> str:
        return "groq"

    @property
    def model_name(self) -> str:
        return self._model

    def _get_client(self):
        if self._client is None and self._api_key:
            try:
                from groq import AsyncGroq
                self._client = AsyncGroq(api_key=self._api_key)
            except Exception as e:
                logger.warning("GroqProvider: Failed to initialize", error=str(e))
        return self._client

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
                    success=False, error="Groq not configured"
                )

            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            response = await client.chat.completions.create(
                model=self._model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )

            latency = (time.time() - start) * 1000
            content = response.choices[0].message.content or ""
            tokens_used = response.usage.total_tokens if response.usage else 0

            logger.info("Groq generation complete", tokens=tokens_used, latency_ms=latency)
            return AIResponse(
                content=content, model=self._model, provider=self.provider_name,
                tokens_used=tokens_used, latency_ms=latency, success=True,
            )
        except Exception as e:
            latency = (time.time() - start) * 1000
            logger.error("Groq generation failed", error=str(e))
            return AIResponse(
                content="", model=self._model, provider=self.provider_name,
                latency_ms=latency, success=False, error=str(e)
            )

    async def is_available(self) -> bool:
        return bool(self._api_key)


class TogetherProvider(BaseAIProvider):
    """Together AI Provider"""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self._api_key = api_key or settings.TOGETHER_API_KEY
        self._model = model or settings.TOGETHER_MODEL
        self._client = None

    @property
    def provider_name(self) -> str:
        return "together"

    @property
    def model_name(self) -> str:
        return self._model

    def _get_client(self):
        if self._client is None and self._api_key:
            try:
                import together
                self._client = together.AsyncTogether(api_key=self._api_key)
            except Exception as e:
                logger.warning("TogetherProvider: Failed to initialize", error=str(e))
        return self._client

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
                    success=False, error="Together AI not configured"
                )

            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            response = await client.chat.completions.create(
                model=self._model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )

            latency = (time.time() - start) * 1000
            content = response.choices[0].message.content or ""
            tokens_used = response.usage.total_tokens if response.usage else 0

            logger.info("Together generation complete", tokens=tokens_used, latency_ms=latency)
            return AIResponse(
                content=content, model=self._model, provider=self.provider_name,
                tokens_used=tokens_used, latency_ms=latency, success=True,
            )
        except Exception as e:
            latency = (time.time() - start) * 1000
            logger.error("Together generation failed", error=str(e))
            return AIResponse(
                content="", model=self._model, provider=self.provider_name,
                latency_ms=latency, success=False, error=str(e)
            )

    async def is_available(self) -> bool:
        return bool(self._api_key)
