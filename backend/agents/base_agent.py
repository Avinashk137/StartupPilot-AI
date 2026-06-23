from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import structlog

from ..services.ai.ai_service import ai_service

logger = structlog.get_logger()


class BaseAgent(ABC):
    """Base class for all StartupPilot AI agents"""

    def __init__(self):
        self.ai_service = ai_service
        self.execution_start: Optional[datetime] = None
        self.execution_end: Optional[datetime] = None
        self.tokens_used: int = 0
        self.provider_used: str = ""
        self.model_used: str = ""

    @property
    @abstractmethod
    def agent_name(self) -> str:
        pass

    @property
    @abstractmethod
    def role(self) -> str:
        pass

    @property
    @abstractmethod
    def goal(self) -> str:
        pass

    @property
    @abstractmethod
    def system_prompt(self) -> str:
        pass

    @abstractmethod
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the agent's task and return structured output"""
        pass

    def _build_context_summary(self, context: Dict[str, Any]) -> str:
        """Build a text summary of the project context for prompts"""
        project = context.get("project", {})
        risk = project.get("risk_appetite", "medium")
        risk_map = {
            "low":    "Conservative — prefer safe, steady, low-risk strategies with stable growth",
            "medium": "Balanced — moderate risk with balanced growth and investment strategies",
            "high":   "Aggressive — high-risk, high-reward strategies; go for rapid, bold growth",
        }
        risk_desc = risk_map.get(risk, risk_map["medium"])
        currency = project.get("budget_currency", "INR")
        budget = project.get("budget", "N/A")
        timeline = project.get("timeline", "N/A")
        state = project.get("state", "")
        country = project.get("country", "India")
        location = f"{state}, {country}" if state else country

        lines = [
            f"Business Name: {project.get('business_name', 'N/A')}",
            f"Business Idea: {project.get('business_idea', 'N/A')}",
            f"Industry: {project.get('industry', 'N/A')}",
            f"Location: {location}",
            f"Target Audience: {project.get('target_audience', 'N/A')}",
            f"Budget: {currency} {budget}",
            f"Currency: {currency} (use this currency for ALL financial figures)",
            f"Business Stage: {project.get('business_stage', 'idea')}",
            f"Risk Appetite: {risk.upper()} — {risk_desc}",
            f"Timeline: {timeline}",
            f"Goals: {project.get('goals', 'N/A')}",
            "",
            f"IMPORTANT INSTRUCTIONS:",
            f"- ALL monetary values must be in {currency}",
            f"- Strategies must reflect the {risk.upper()} risk appetite described above",
            f"- Market analysis must focus on the {location} region specifically",
            f"- Financial projections must align with a {timeline} timeline",
        ]
        return "\n".join(lines)

    async def _generate_json(self, prompt: str, temperature: float = 0.4) -> dict:
        """Helper to call AI service and get JSON response"""
        logger.info(f"Prompt Sent", agent=self.agent_name, prompt_length=len(prompt))
        response, parsed = await self.ai_service.generate_json(
            prompt=prompt,
            system_prompt=self.system_prompt,
            temperature=temperature,
        )
        self.tokens_used += response.tokens_used
        self.provider_used = response.provider
        self.model_used = response.model
        logger.info(f"Model Used", agent=self.agent_name, model=response.model, provider=response.provider)
        logger.info(f"Response Received", agent=self.agent_name, tokens=response.tokens_used, success=response.success)
        return parsed

    def _get_duration_ms(self) -> Optional[int]:
        if self.execution_start and self.execution_end:
            delta = self.execution_end - self.execution_start
            return int(delta.total_seconds() * 1000)
        return None
