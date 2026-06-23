from abc import ABC, abstractmethod
from typing import Optional
from .models import AIResponse


class BaseAIProvider(ABC):
    """Abstract base class for all AI providers.
    
    Every provider MUST implement this interface.
    No agent can communicate directly with a provider - all must go through AIService.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Unique identifier for this provider (e.g., 'gemini', 'openai')"""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Current model being used"""
        pass

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 8192,
    ) -> AIResponse:
        """Generate a response from the AI provider.

        Args:
            prompt: The user prompt
            system_prompt: Optional system/role context
            temperature: Creativity level (0.0-1.0)
            max_tokens: Maximum tokens to generate

        Returns:
            AIResponse with unified format
        """
        pass

    @abstractmethod
    async def is_available(self) -> bool:
        """Check if this provider is configured and reachable"""
        pass

    def get_info(self) -> dict:
        """Get provider metadata"""
        return {
            "provider": self.provider_name,
            "model": self.model_name,
        }
