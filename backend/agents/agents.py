from typing import Dict, Any
from datetime import datetime, timezone
import structlog
from .base_agent import BaseAgent

logger = structlog.get_logger()


class ResearchAgent(BaseAgent):
    """Market Research Specialist Agent"""

    @property
    def agent_name(self) -> str:
        return "research"

    @property
    def role(self) -> str:
        return "Market Research Specialist"

    @property
    def goal(self) -> str:
        return "Conduct comprehensive market research and provide actionable insights for the startup"

    @property
    def system_prompt(self) -> str:
        return """You are an expert Market Research Specialist with 15+ years of experience analyzing markets across industries worldwide.
        
Your job is to conduct thorough market research for startup ideas and provide:
- Realistic market size estimates (TAM, SAM, SOM) with data-driven reasoning
- Market growth trends and future outlook
- Customer segments with detailed personas
- Key customer pain points and unmet needs  
- Market opportunities and threats
- Actionable recommendations

Always provide specific, realistic numbers based on industry knowledge.
Format all responses as valid JSON following the exact schema requested.
Be thorough, insightful, and business-focused."""

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        self.execution_start = datetime.now(timezone.utc)
        logger.info(f"ResearchAgent starting execution", project_id=context.get("project", {}).get("id"))

        project_summary = self._build_context_summary(context)

        project = context.get("project", {})
        currency = project.get("budget_currency", "INR")
        state = project.get("state", "")
        country = project.get("country", "India")
        location = f"{state}, {country}" if state else country
        risk = project.get("risk_appetite", "medium")

        prompt = f"""Conduct comprehensive market research for this startup:

{project_summary}

Focus your research specifically on the {location} market.
Risk Profile: {risk.upper()} — adjust market opportunity sizing accordingly.
All currency values must be in {currency}.

Return a JSON object with EXACTLY this structure:
{{
  "market_size": "string describing total market size with {currency} currency",
  "tam": "Total Addressable Market in {location} with size in {currency}",
  "sam": "Serviceable Addressable Market in {currency}",
  "som": "Serviceable Obtainable Market — realistic first-year estimate in {currency}",
  "growth_rate": "Annual market growth rate percentage",
  "growth_trends": [
    {{"trend": "trend name", "description": "explanation relevant to {location}", "impact": "high/medium/low"}}
  ],
  "customer_segments": [
    {{"segment": "segment name", "size": "percentage of market", "description": "who they are in {location}", "pain_points": ["pain1", "pain2"]}}
  ],
  "pain_points": ["pain point 1", "pain point 2", "pain point 3", "pain point 4", "pain point 5"],
  "opportunities": [
    {{"opportunity": "name", "description": "explanation for {location}", "potential": "high/medium/low"}}
  ],
  "risks": [
    {{"risk": "risk name", "description": "explanation", "severity": "high/medium/low", "mitigation": "how to handle"}}
  ],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3", "recommendation 4"],
  "key_insights": ["insight 1 about {location} market", "insight 2", "insight 3"]
}}"""

        result = await self._generate_json(prompt)
        self.execution_end = datetime.now(timezone.utc)

        logger.info(f"ResearchAgent completed", tokens_used=self.tokens_used)
        return {
            "agent": self.agent_name,
            "data": result,
            "tokens_used": self.tokens_used,
            "provider": self.provider_used,
            "model": self.model_used,
            "duration_ms": self._get_duration_ms(),
        }


class CompetitorAgent(BaseAgent):
    """Competitor Intelligence Expert Agent"""

    @property
    def agent_name(self) -> str:
        return "competitor"

    @property
    def role(self) -> str:
        return "Competitor Intelligence Expert"

    @property
    def goal(self) -> str:
        return "Identify and analyze competitors to find market gaps and competitive advantages"

    @property
    def system_prompt(self) -> str:
        return """You are an expert Competitor Intelligence Analyst with deep experience in competitive strategy and market positioning.

You analyze competitive landscapes to help startups understand:
- Who their competitors are and their market position
- Pricing strategies and service offerings
- Strengths and weaknesses of each competitor
- SWOT analysis of the competitive environment
- Market gaps that represent opportunities
- Sustainable competitive advantages

Always provide realistic, research-based competitor analysis.
Format responses as valid JSON following the exact schema requested."""

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        self.execution_start = datetime.now(timezone.utc)
        logger.info(f"CompetitorAgent starting execution")

        project_summary = self._build_context_summary(context)
        research_data = context.get("research_data", {})

        prompt = f"""Analyze the competitive landscape for this startup:

{project_summary}

Market Context:
{research_data.get('market_size', 'N/A')} market, Growth: {research_data.get('growth_rate', 'N/A')}

Return a JSON object with EXACTLY this structure:
{{
  "competitors": [
    {{
      "name": "competitor name",
      "type": "direct/indirect",
      "website": "website.com",
      "description": "brief description",
      "pricing": "pricing model and range",
      "services": ["service1", "service2", "service3"],
      "strengths": ["strength1", "strength2", "strength3"],
      "weaknesses": ["weakness1", "weakness2", "weakness3"],
      "market_share": "estimated market share or position",
      "target_market": "who they serve"
    }}
  ],
  "market_gaps": [
    {{"gap": "gap description", "opportunity": "how to capitalize", "size": "large/medium/small"}}
  ],
  "swot_analysis": {{
    "strengths": ["our strength 1", "our strength 2", "our strength 3"],
    "weaknesses": ["our weakness 1", "our weakness 2"],
    "opportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
    "threats": ["threat 1", "threat 2", "threat 3"]
  }},
  "competitive_advantages": ["advantage 1", "advantage 2", "advantage 3"],
  "pricing_analysis": {{
    "market_average": "typical pricing in the market",
    "our_recommended_price": "suggested pricing strategy",
    "rationale": "why this pricing makes sense"
  }},
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}}"""

        result = await self._generate_json(prompt)
        self.execution_end = datetime.now(timezone.utc)

        return {
            "agent": self.agent_name,
            "data": result,
            "tokens_used": self.tokens_used,
            "provider": self.provider_used,
            "model": self.model_used,
            "duration_ms": self._get_duration_ms(),
        }


class BusinessPlanAgent(BaseAgent):
    """Business Plan Generator Agent"""

    @property
    def agent_name(self) -> str:
        return "business_plan"

    @property
    def role(self) -> str:
        return "Business Strategy Consultant"

    @property
    def goal(self) -> str:
        return "Create a comprehensive, investor-ready business plan"

    @property
    def system_prompt(self) -> str:
        return """You are an elite Business Strategy Consultant with MBA expertise and experience building 100+ business plans for startups.

You create comprehensive business plans that are:
- Investor-ready and professionally structured
- Realistic with achievable milestones
- Data-driven based on market research
- Strategically sound with clear competitive positioning

Your business plans cover executive summary, mission/vision, market analysis, revenue model, operations, marketing, and growth strategy.
Format responses as valid JSON."""

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        self.execution_start = datetime.now(timezone.utc)
        logger.info(f"BusinessPlanAgent starting execution")

        project_summary = self._build_context_summary(context)
        research_data = context.get("research_data", {})
        competitor_data = context.get("competitor_data", {})

        prompt = f"""Create a comprehensive business plan for this startup:

{project_summary}

Market Size: {research_data.get('market_size', 'N/A')}
Top Competitors: {[c.get('name') for c in competitor_data.get('competitors', [])[:3]]}
Key Market Gap: {competitor_data.get('market_gaps', [{}])[0].get('gap', 'N/A') if competitor_data.get('market_gaps') else 'N/A'}

Return a JSON object with EXACTLY this structure:
{{
  "executive_summary": "compelling 2-3 paragraph overview of the entire business",
  "mission": "mission statement (1-2 sentences)",
  "vision": "vision statement for 5-10 year future",
  "target_market": "detailed description of primary target market",
  "customer_segments": [
    {{"segment": "name", "description": "who they are", "size": "percentage", "acquisition_strategy": "how to reach them"}}
  ],
  "value_proposition": "clear unique value proposition statement",
  "revenue_model": [
    {{"stream": "revenue stream name", "description": "how it works", "pricing": "price point", "margin": "expected margin"}}
  ],
  "pricing_strategy": {{
    "model": "pricing model type",
    "tiers": [{{"tier": "name", "price": "amount", "features": ["feature1", "feature2"]}}],
    "rationale": "why this pricing works"
  }},
  "sales_plan": {{
    "channels": ["channel1", "channel2"],
    "strategy": "overall sales approach",
    "targets": [{{"period": "Month 1-3", "goal": "specific goal"}}]
  }},
  "marketing_plan": {{
    "strategy": "overall marketing approach",
    "channels": ["channel1", "channel2"],
    "budget_allocation": {{"digital": "40%", "content": "30%", "partnerships": "30%"}}
  }},
  "operations_plan": {{
    "team": [{{"role": "role name", "responsibilities": "what they do", "timing": "when to hire"}}],
    "technology": ["tech stack item 1", "tech stack item 2"],
    "processes": ["key process 1", "key process 2"]
  }},
  "growth_strategy": {{
    "phase1": {{"period": "0-6 months", "focus": "what to focus on", "milestones": ["milestone1", "milestone2"]}},
    "phase2": {{"period": "6-18 months", "focus": "what to focus on", "milestones": ["milestone1", "milestone2"]}},
    "phase3": {{"period": "18-36 months", "focus": "what to focus on", "milestones": ["milestone1", "milestone2"]}}
  }},
  "swot_analysis": {{
    "strengths": ["strength1", "strength2", "strength3"],
    "weaknesses": ["weakness1", "weakness2"],
    "opportunities": ["opportunity1", "opportunity2", "opportunity3"],
    "threats": ["threat1", "threat2"]
  }},
  "risk_analysis": [
    {{"risk": "risk name", "probability": "high/medium/low", "impact": "high/medium/low", "mitigation": "strategy"}}
  ],
  "exit_strategy": "description of potential exit strategies",
  "milestones": [
    {{"milestone": "milestone name", "target_date": "Month X", "metric": "how to measure success"}}
  ]
}}"""

        result = await self._generate_json(prompt)
        self.execution_end = datetime.now(timezone.utc)

        return {
            "agent": self.agent_name,
            "data": result,
            "tokens_used": self.tokens_used,
            "provider": self.provider_used,
            "model": self.model_used,
            "duration_ms": self._get_duration_ms(),
        }


class FinanceAgent(BaseAgent):
    """Financial Planning Agent"""

    @property
    def agent_name(self) -> str:
        return "finance"

    @property
    def role(self) -> str:
        return "Chief Financial Officer (CFO) Advisor"

    @property
    def goal(self) -> str:
        return "Create detailed financial projections, forecasts and investment analysis"

    @property
    def system_prompt(self) -> str:
        return """You are a seasoned CFO and financial advisor who has helped 200+ startups with financial planning.

You create detailed, realistic financial models including:
- Startup cost breakdowns
- Monthly operating costs
- 12-month revenue and profit forecasts
- Cash flow projections
- Break-even analysis
- ROI and payback period calculations
- Funding requirements

Always use realistic numbers based on the industry and budget provided.
Format all responses as valid JSON with numbers as integers or floats (not strings with currency symbols)."""

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        self.execution_start = datetime.now(timezone.utc)
        logger.info(f"FinanceAgent starting execution")

        project_summary = self._build_context_summary(context)
        business_plan = context.get("business_plan_data", {})

        project = context.get("project", {})
        currency = project.get("budget_currency", "INR")
        budget = project.get("budget", 50000)
        industry = project.get("industry", "general")
        risk = project.get("risk_appetite", "medium")
        timeline = project.get("timeline", "12 months")

        # Risk appetite adjustments for financial projections
        risk_guidance = {
            "low":    "Use conservative projections: slow but steady growth, minimal debt, prefer profitability over growth speed, lower CAC assumptions.",
            "medium": "Use balanced projections: moderate growth trajectory, reinvest profits strategically.",
            "high":   "Use aggressive projections: rapid growth assumptions, invest heavily in acquisition, prioritize market share over early profitability.",
        }.get(risk, "Use balanced projections.")

        prompt = f"""Create comprehensive financial projections for this startup:

{project_summary}

Revenue Model: {business_plan.get('revenue_model', 'N/A')}
Pricing: {business_plan.get('pricing_strategy', {}).get('model', 'N/A')}

Risk Guidance: {risk_guidance}
Timeline: The projections must cover {timeline}.

Return a JSON object with EXACTLY this structure (use numbers ONLY — no currency symbols, no strings for numeric fields):
{{
  "startup_costs": {{
    "total": 50000,
    "breakdown": [
      {{"item": "cost item name", "amount": 5000, "category": "technology/marketing/operations/legal", "one_time": true}}
    ]
  }},
  "monthly_costs": {{
    "total": 8000,
    "breakdown": [
      {{"item": "monthly cost item", "amount": 500, "category": "salaries/marketing/technology/rent/other"}}
    ]
  }},
  "revenue_forecast": [
    {{"month": 1, "revenue": 2000, "customers": 5, "avg_revenue_per_customer": 400}},
    {{"month": 2, "revenue": 3500, "customers": 9, "avg_revenue_per_customer": 389}},
    {{"month": 3, "revenue": 5000, "customers": 13, "avg_revenue_per_customer": 385}},
    {{"month": 4, "revenue": 7000, "customers": 18, "avg_revenue_per_customer": 389}},
    {{"month": 5, "revenue": 9500, "customers": 24, "avg_revenue_per_customer": 396}},
    {{"month": 6, "revenue": 12000, "customers": 30, "avg_revenue_per_customer": 400}},
    {{"month": 7, "revenue": 15000, "customers": 37, "avg_revenue_per_customer": 405}},
    {{"month": 8, "revenue": 18000, "customers": 44, "avg_revenue_per_customer": 409}},
    {{"month": 9, "revenue": 22000, "customers": 53, "avg_revenue_per_customer": 415}},
    {{"month": 10, "revenue": 26000, "customers": 62, "avg_revenue_per_customer": 419}},
    {{"month": 11, "revenue": 30000, "customers": 71, "avg_revenue_per_customer": 423}},
    {{"month": 12, "revenue": 35000, "customers": 82, "avg_revenue_per_customer": 427}}
  ],
  "profit_forecast": [
    {{"month": 1, "revenue": 2000, "costs": 8000, "profit": -6000, "margin": -300}},
    {{"month": 2, "revenue": 3500, "costs": 8200, "profit": -4700, "margin": -134}},
    {{"month": 3, "revenue": 5000, "costs": 8400, "profit": -3400, "margin": -68}},
    {{"month": 4, "revenue": 7000, "costs": 8600, "profit": -1600, "margin": -23}},
    {{"month": 5, "revenue": 9500, "costs": 8800, "profit": 700, "margin": 7}},
    {{"month": 6, "revenue": 12000, "costs": 9000, "profit": 3000, "margin": 25}},
    {{"month": 7, "revenue": 15000, "costs": 9500, "profit": 5500, "margin": 37}},
    {{"month": 8, "revenue": 18000, "costs": 10000, "profit": 8000, "margin": 44}},
    {{"month": 9, "revenue": 22000, "costs": 10500, "profit": 11500, "margin": 52}},
    {{"month": 10, "revenue": 26000, "costs": 11000, "profit": 15000, "margin": 58}},
    {{"month": 11, "revenue": 30000, "costs": 11500, "profit": 18500, "margin": 62}},
    {{"month": 12, "revenue": 35000, "costs": 12000, "profit": 23000, "margin": 66}}
  ],
  "cashflow_forecast": [
    {{"month": 1, "inflow": 2000, "outflow": 58000, "net": -56000, "cumulative": -56000}},
    {{"month": 2, "inflow": 3500, "outflow": 8200, "net": -4700, "cumulative": -60700}},
    {{"month": 3, "inflow": 5000, "outflow": 8400, "net": -3400, "cumulative": -64100}},
    {{"month": 4, "inflow": 7000, "outflow": 8600, "net": -1600, "cumulative": -65700}},
    {{"month": 5, "inflow": 9500, "outflow": 8800, "net": 700, "cumulative": -65000}},
    {{"month": 6, "inflow": 12000, "outflow": 9000, "net": 3000, "cumulative": -62000}},
    {{"month": 7, "inflow": 15000, "outflow": 9500, "net": 5500, "cumulative": -56500}},
    {{"month": 8, "inflow": 18000, "outflow": 10000, "net": 8000, "cumulative": -48500}},
    {{"month": 9, "inflow": 22000, "outflow": 10500, "net": 11500, "cumulative": -37000}},
    {{"month": 10, "inflow": 26000, "outflow": 11000, "net": 15000, "cumulative": -22000}},
    {{"month": 11, "inflow": 30000, "outflow": 11500, "net": 18500, "cumulative": -3500}},
    {{"month": 12, "inflow": 35000, "outflow": 12000, "net": 23000, "cumulative": 19500}}
  ],
  "breakeven_analysis": {{
    "breakeven_month": 5,
    "breakeven_revenue": 8800,
    "breakeven_customers": 22,
    "fixed_costs_monthly": 7000,
    "variable_cost_per_customer": 80,
    "contribution_margin": 320
  }},
  "roi_estimation": {{
    "initial_investment": 50000,
    "year1_roi": -60,
    "year2_roi": 120,
    "year3_roi": 280,
    "payback_period_months": 14,
    "npv_3year": 85000,
    "irr": 45
  }},
  "financial_ratios": {{
    "gross_margin": 75,
    "net_margin_year1": -15,
    "net_margin_year2": 25,
    "customer_ltv": 2400,
    "customer_cac": 200,
    "ltv_cac_ratio": 12,
    "monthly_burn_rate": 8000
  }},
  "funding_requirements": {{
    "total_needed": 75000,
    "runway_months": 9,
    "use_of_funds": [
      {{"purpose": "Product Development", "amount": 20000, "percentage": 27}},
      {{"purpose": "Marketing & Sales", "amount": 25000, "percentage": 33}},
      {{"purpose": "Operations", "amount": 15000, "percentage": 20}},
      {{"purpose": "Working Capital", "amount": 15000, "percentage": 20}}
    ]
  }},
  "summary_metrics": {{
    "year1_total_revenue": 184500,
    "year1_total_profit": -10200,
    "year2_projected_revenue": 650000,
    "year2_projected_profit": 162500,
    "annual_growth_rate": 252
  }},
  "currency": "{currency}"
}}

Adjust ALL numbers to be realistic for budget {currency} {budget} and industry {industry}.
The risk appetite is {risk.upper()} — {risk_guidance}"""

        result = await self._generate_json(prompt, temperature=0.2)
        self.execution_end = datetime.now(timezone.utc)

        return {
            "agent": self.agent_name,
            "data": result,
            "tokens_used": self.tokens_used,
            "provider": self.provider_used,
            "model": self.model_used,
            "duration_ms": self._get_duration_ms(),
        }


class MarketingAgent(BaseAgent):
    """Marketing Strategy Agent"""

    @property
    def agent_name(self) -> str:
        return "marketing"

    @property
    def role(self) -> str:
        return "Chief Marketing Officer (CMO)"

    @property
    def goal(self) -> str:
        return "Create comprehensive marketing strategy and content for all channels"

    @property
    def system_prompt(self) -> str:
        return """You are a creative and strategic CMO with expertise in digital marketing, content creation, and growth hacking.

You create complete marketing strategies including:
- Social media content for all major platforms
- Email marketing campaigns
- SEO and content strategies
- Influencer and partnership strategies
- Growth hacking tactics
- Marketing calendars and content calendars

All content should be professional, engaging, and tailored to the specific business and audience.
Format responses as valid JSON."""

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        self.execution_start = datetime.now(timezone.utc)
        logger.info(f"MarketingAgent starting execution")

        project_summary = self._build_context_summary(context)
        business_plan = context.get("business_plan_data", {})
        competitor_data = context.get("competitor_data", {})

        prompt = f"""Create a comprehensive marketing strategy for this startup:

{project_summary}

Value Proposition: {business_plan.get('value_proposition', 'N/A')}
Target Market: {business_plan.get('target_market', 'N/A')}

Return a JSON object with EXACTLY this structure:
{{
  "instagram_posts": [
    {{"type": "launch/promotional/educational/story", "caption": "full caption text", "hashtags": ["#tag1", "#tag2"], "image_concept": "description of what the image should show", "cta": "call to action"}}
  ],
  "linkedin_posts": [
    {{"type": "thought_leadership/company_update/product", "content": "full post content", "cta": "call to action"}}
  ],
  "twitter_posts": [
    {{"tweet": "tweet text under 280 chars", "thread": ["tweet 1", "tweet 2", "tweet 3"] }}
  ],
  "facebook_posts": [
    {{"type": "post type", "content": "full post content", "cta": "call to action"}}
  ],
  "email_campaigns": [
    {{"campaign": "campaign name", "subject": "email subject line", "preview": "preview text", "body": "email body HTML", "cta": "call to action", "target_segment": "who receives this"}}
  ],
  "marketing_strategy": {{
    "positioning": "brand positioning statement",
    "key_messages": ["message1", "message2", "message3"],
    "brand_voice": "description of brand tone and personality",
    "channels": [{{"channel": "channel name", "priority": "primary/secondary", "budget_percent": 20, "strategy": "approach"}}]
  }},
  "content_calendar": [
    {{"week": 1, "theme": "launch week", "posts": [{{"platform": "instagram", "day": "Monday", "type": "announcement", "topic": "post topic"}}]}}
  ],
  "lead_gen_strategy": {{
    "tactics": ["tactic1", "tactic2", "tactic3"],
    "lead_magnet": "description of lead magnet offer",
    "funnel": ["awareness", "interest", "consideration", "conversion"]
  }},
  "seo_strategy": {{
    "target_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
    "content_topics": ["topic1", "topic2", "topic3"],
    "backlink_strategy": "approach to building backlinks",
    "local_seo": "local SEO tactics if applicable"
  }},
  "growth_hacking_plan": [
    {{"tactic": "tactic name", "description": "how it works", "expected_result": "what we expect", "effort": "low/medium/high", "impact": "low/medium/high"}}
  ],
  "hashtags": {{
    "brand": ["#brandhashtag"],
    "industry": ["#industry1", "#industry2"],
    "trending": ["#trending1", "#trending2"],
    "campaign": ["#campaign1"]
  }}
}}"""

        result = await self._generate_json(prompt, temperature=0.7)
        self.execution_end = datetime.now(timezone.utc)

        return {
            "agent": self.agent_name,
            "data": result,
            "tokens_used": self.tokens_used,
            "provider": self.provider_used,
            "model": self.model_used,
            "duration_ms": self._get_duration_ms(),
        }


class AdvertisementAgent(BaseAgent):
    """Advertisement Creation Agent"""

    @property
    def agent_name(self) -> str:
        return "advertisement"

    @property
    def role(self) -> str:
        return "Performance Marketing Expert"

    @property
    def goal(self) -> str:
        return "Create high-converting ad copies and campaign structures for all advertising platforms"

    @property
    def system_prompt(self) -> str:
        return """You are a Performance Marketing Expert specializing in paid advertising across Google, Meta, LinkedIn, and other platforms.

You create high-converting ad campaigns including:
- Google Search and Display ads
- Facebook and Instagram ads
- LinkedIn ads
- Retargeting campaigns
- Ad copy with multiple headline variations
- Campaign structures and budgets

Focus on conversion-optimized copy that speaks directly to customer pain points.
Format responses as valid JSON."""

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        self.execution_start = datetime.now(timezone.utc)
        logger.info(f"AdvertisementAgent starting execution")

        project_summary = self._build_context_summary(context)
        marketing_data = context.get("marketing_data", {})
        business_plan = context.get("business_plan_data", {})

        prompt = f"""Create comprehensive advertising campaigns for this startup:

{project_summary}

Value Proposition: {business_plan.get('value_proposition', 'N/A')}
Target Segments: {[s.get('segment') for s in business_plan.get('customer_segments', [])[:3]]}

Return a JSON object with EXACTLY this structure:
{{
  "google_ads": {{
    "search_campaigns": [
      {{
        "campaign_name": "campaign name",
        "keywords": ["keyword1", "keyword2", "keyword3"],
        "headlines": ["headline1 (30 chars max)", "headline2", "headline3"],
        "descriptions": ["description1 (90 chars max)", "description2"],
        "display_url": "/path/to/show"
      }}
    ],
    "display_ads": [
      {{"size": "300x250", "headline": "ad headline", "description": "ad description", "cta": "button text"}}
    ]
  }},
  "facebook_ads": [
    {{
      "campaign_objective": "awareness/traffic/conversion/lead_generation",
      "audience": "detailed audience description",
      "ad_format": "single_image/carousel/video",
      "primary_text": "main ad copy text",
      "headline": "ad headline",
      "description": "short description",
      "cta": "Learn More/Sign Up/Shop Now/etc"
    }}
  ],
  "instagram_ads": [
    {{
      "format": "feed/story/reel",
      "visual_concept": "description of what the creative should look like",
      "caption": "ad caption",
      "cta": "button text",
      "audience": "target audience"
    }}
  ],
  "linkedin_ads": [
    {{
      "format": "sponsored_content/message_ad/text_ad",
      "headline": "ad headline",
      "intro_text": "introductory text",
      "cta": "button text",
      "targeting": "job titles/industries/company sizes to target"
    }}
  ],
  "retargeting_ads": [
    {{
      "audience": "website visitors/cart abandoners/video viewers",
      "message": "retargeting message",
      "offer": "special offer or incentive",
      "platform": "facebook/google/linkedin"
    }}
  ],
  "headlines": ["headline variation 1", "headline variation 2", "headline variation 3", "headline variation 4", "headline variation 5"],
  "cta_variations": ["CTA option 1", "CTA option 2", "CTA option 3", "CTA option 4"],
  "budget_recommendations": {{
    "total_monthly": 5000,
    "allocation": [
      {{"platform": "Google Ads", "amount": 2000, "percentage": 40, "rationale": "why this allocation"}},
      {{"platform": "Facebook/Instagram", "amount": 2000, "percentage": 40, "rationale": "why"}},
      {{"platform": "LinkedIn", "amount": 500, "percentage": 10, "rationale": "why"}},
      {{"platform": "Retargeting", "amount": 500, "percentage": 10, "rationale": "why"}}
    ]
  }},
  "campaign_structure": {{
    "phase1": {{"duration": "Month 1-2", "focus": "awareness", "budget": 3000, "kpi": "reach and impressions"}},
    "phase2": {{"duration": "Month 3-4", "focus": "lead generation", "budget": 5000, "kpi": "cost per lead"}},
    "phase3": {{"duration": "Month 5+", "focus": "conversion optimization", "budget": 7000, "kpi": "ROAS and conversions"}}
  }}
}}

Adjust budget numbers to be realistic for the business budget of {context.get('project', {}).get('budget', 50000)} {context.get('project', {}).get('budget_currency', 'USD')}."""

        result = await self._generate_json(prompt, temperature=0.6)
        self.execution_end = datetime.now(timezone.utc)

        return {
            "agent": self.agent_name,
            "data": result,
            "tokens_used": self.tokens_used,
            "provider": self.provider_used,
            "model": self.model_used,
            "duration_ms": self._get_duration_ms(),
        }


class AnalyticsAgent(BaseAgent):
    """CEO Analytics & Scoring Agent"""

    @property
    def agent_name(self) -> str:
        return "analytics"

    @property
    def role(self) -> str:
        return "AI CEO & Business Intelligence Analyst"

    @property
    def goal(self) -> str:
        return "Analyze all data to provide CEO-level insights, scores, and strategic recommendations"

    @property
    def system_prompt(self) -> str:
        return """You are an AI CEO and Business Intelligence Expert who synthesizes all business data to provide:

- Objective business health scores (0-100) across 8 dimensions
- Strategic CEO recommendations
- Risk alerts and mitigation strategies  
- Growth opportunities
- Weekly action plans

Be objective, data-driven, and honest about challenges while being constructive.
Scores should reflect realistic assessment - not everything should be 90+.
Format responses as valid JSON."""

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        self.execution_start = datetime.now(timezone.utc)
        logger.info(f"AnalyticsAgent starting execution")

        project = context.get("project", {})
        research = context.get("research_data", {})
        competitor = context.get("competitor_data", {})
        business_plan = context.get("business_plan_data", {})
        finance = context.get("finance_data", {})
        marketing = context.get("marketing_data", {})

        prompt = f"""As the AI CEO, analyze all data and provide comprehensive business intelligence:

Business: {project.get('business_name', 'N/A')} - {project.get('business_idea', 'N/A')}
Industry: {project.get('industry', 'N/A')}, Country: {project.get('country', 'N/A')}
Budget: {project.get('budget', 'N/A')} {project.get('budget_currency', 'USD')}
Stage: {project.get('business_stage', 'idea')}
Risk Appetite: {project.get('risk_appetite', 'medium')}

Market Size: {research.get('market_size', 'N/A')}
Competitors: {len(competitor.get('competitors', []))} identified
Value Prop: {business_plan.get('value_proposition', 'N/A')}
Year 1 Revenue Target: {finance.get('summary_metrics', {}).get('year1_total_revenue', 'N/A')}
Breakeven Month: {finance.get('breakeven_analysis', {}).get('breakeven_month', 'N/A')}
LTV:CAC Ratio: {finance.get('financial_ratios', {}).get('ltv_cac_ratio', 'N/A')}

Return a JSON object with EXACTLY this structure:
{{
  "scores": {{
    "health_score": 72,
    "market_opportunity_score": 81,
    "competition_score": 65,
    "financial_health_score": 68,
    "marketing_score": 75,
    "readiness_score": 70,
    "risk_score": 58,
    "growth_score": 77,
    "overall_score": 71
  }},
  "score_explanations": {{
    "health_score": "explanation for why this score was given",
    "market_opportunity_score": "explanation",
    "competition_score": "explanation",
    "financial_health_score": "explanation",
    "marketing_score": "explanation",
    "readiness_score": "explanation",
    "risk_score": "explanation - higher = more risky",
    "growth_score": "explanation"
  }},
  "ceo_recommendations": [
    {{"priority": "critical/high/medium", "recommendation": "specific actionable recommendation", "timeline": "immediate/30_days/90_days", "expected_impact": "what this will achieve"}}
  ],
  "risk_alerts": [
    {{"alert": "risk description", "severity": "critical/high/medium/low", "action": "what to do immediately"}}
  ],
  "growth_opportunities": [
    {{"opportunity": "opportunity name", "description": "detailed explanation", "potential_revenue": 50000, "effort": "low/medium/high", "timeline": "timeframe"}}
  ],
  "weekly_action_plan": {{
    "week1": [{{"task": "specific task", "owner": "founder/team/hire", "priority": "critical/high/medium"}}],
    "week2": [{{"task": "specific task", "owner": "founder", "priority": "high"}}],
    "week3": [{{"task": "specific task", "owner": "founder", "priority": "medium"}}],
    "week4": [{{"task": "specific task", "owner": "founder", "priority": "medium"}}]
  }},
  "optimization_suggestions": [
    {{"area": "area name", "current_issue": "what is suboptimal", "suggestion": "specific improvement", "impact": "expected impact"}}
  ],
  "ceo_summary": "2-3 paragraph executive summary from the AI CEO perspective summarizing the overall assessment and key priorities"
}}"""

        result = await self._generate_json(prompt, temperature=0.3)
        self.execution_end = datetime.now(timezone.utc)

        return {
            "agent": self.agent_name,
            "data": result,
            "tokens_used": self.tokens_used,
            "provider": self.provider_used,
            "model": self.model_used,
            "duration_ms": self._get_duration_ms(),
        }


class StrategyMasterAgent(BaseAgent):
    """Master Agent for Research, Competitor, and Business Plan"""

    @property
    def agent_name(self) -> str:
        return "strategy_master"

    @property
    def role(self) -> str:
        return "Elite Startup Strategy Consultant"

    @property
    def goal(self) -> str:
        return "Provide market research, competitor analysis, and a comprehensive business plan in one step"

    @property
    def system_prompt(self) -> str:
        return """You are an elite Startup Strategy Consultant combining the roles of a Market Research Specialist, Competitor Intelligence Analyst, and Business Strategy Consultant.
You conduct thorough market research, analyze competitive landscapes, and create comprehensive investor-ready business plans.
Always provide specific, realistic numbers. Format responses as valid JSON."""

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        self.execution_start = datetime.now(timezone.utc)
        logger.info(f"StrategyMasterAgent starting execution")

        project_summary = self._build_context_summary(context)
        project = context.get("project", {})
        currency = project.get("budget_currency", "INR")
        state = project.get("state", "")
        country = project.get("country", "India")
        location = f"{state}, {country}" if state else country
        risk = project.get("risk_appetite", "medium")

        prompt = f"""Analyze and create the foundational strategy for this startup:

{project_summary}

Focus market research on the {location} market.
Risk Profile: {risk.upper()}. Currency: {currency}.

Return a JSON object with EXACTLY this structure:
{{
  "research": {{
    "market_size": "string describing total market size with {currency} currency",
    "tam": "Total Addressable Market in {location} with size in {currency}",
    "sam": "Serviceable Addressable Market in {currency}",
    "som": "Serviceable Obtainable Market — realistic first-year estimate in {currency}",
    "growth_rate": "Annual market growth rate percentage",
    "growth_trends": [
      {{"trend": "trend name", "description": "explanation relevant to {location}", "impact": "high/medium/low"}}
    ],
    "customer_segments": [
      {{"segment": "segment name", "size": "percentage of market", "description": "who they are in {location}", "pain_points": ["pain1", "pain2"]}}
    ],
    "pain_points": ["pain point 1", "pain point 2", "pain point 3"],
    "opportunities": [
      {{"opportunity": "name", "description": "explanation for {location}", "potential": "high/medium/low"}}
    ],
    "risks": [
      {{"risk": "risk name", "description": "explanation", "severity": "high/medium/low", "mitigation": "how to handle"}}
    ],
    "recommendations": ["recommendation 1", "recommendation 2"],
    "key_insights": ["insight 1", "insight 2"]
  }},
  "competitor": {{
    "competitors": [
      {{
        "name": "competitor name",
        "type": "direct/indirect",
        "website": "website.com",
        "description": "brief description",
        "pricing": "pricing model and range",
        "services": ["service1", "service2"],
        "strengths": ["strength1", "strength2"],
        "weaknesses": ["weakness1", "weakness2"],
        "market_share": "estimated market share or position",
        "target_market": "who they serve"
      }}
    ],
    "market_gaps": [
      {{"gap": "gap description", "opportunity": "how to capitalize", "size": "large/medium/small"}}
    ],
    "swot_analysis": {{
      "strengths": ["our strength 1", "our strength 2"],
      "weaknesses": ["our weakness 1"],
      "opportunities": ["opportunity 1"],
      "threats": ["threat 1"]
    }},
    "competitive_advantages": ["advantage 1", "advantage 2"],
    "pricing_analysis": {{
      "market_average": "typical pricing in the market",
      "our_recommended_price": "suggested pricing strategy",
      "rationale": "why this pricing makes sense"
    }},
    "recommendations": ["recommendation 1", "recommendation 2"]
  }},
  "business_plan": {{
    "executive_summary": "compelling 2-3 paragraph overview of the entire business",
    "mission": "mission statement (1-2 sentences)",
    "vision": "vision statement for 5-10 year future",
    "target_market": "detailed description of primary target market",
    "customer_segments": [
      {{"segment": "name", "description": "who they are", "size": "percentage", "acquisition_strategy": "how to reach them"}}
    ],
    "value_proposition": "clear unique value proposition statement",
    "revenue_model": [
      {{"stream": "revenue stream name", "description": "how it works", "pricing": "price point", "margin": "expected margin"}}
    ],
    "pricing_strategy": {{
      "model": "pricing model type",
      "tiers": [{{"tier": "name", "price": "amount", "features": ["feature1"]}}],
      "rationale": "why this pricing works"
    }},
    "sales_plan": {{
      "channels": ["channel1"],
      "strategy": "overall sales approach",
      "targets": [{{"period": "Month 1-3", "goal": "specific goal"}}]
    }},
    "marketing_plan": {{
      "strategy": "overall marketing approach",
      "channels": ["channel1"],
      "budget_allocation": {{"digital": "40%", "content": "30%", "partnerships": "30%"}}
    }},
    "operations_plan": {{
      "team": [{{"role": "role name", "responsibilities": "what they do", "timing": "when to hire"}}],
      "technology": ["tech stack item 1"],
      "processes": ["key process 1"]
    }},
    "growth_strategy": {{
      "phase1": {{"period": "0-6 months", "focus": "what to focus on", "milestones": ["milestone1"]}},
      "phase2": {{"period": "6-18 months", "focus": "what to focus on", "milestones": ["milestone1"]}},
      "phase3": {{"period": "18-36 months", "focus": "what to focus on", "milestones": ["milestone1"]}}
    }},
    "swot_analysis": {{
      "strengths": ["strength1"],
      "weaknesses": ["weakness1"],
      "opportunities": ["opportunity1"],
      "threats": ["threat1"]
    }},
    "risk_analysis": [
      {{"risk": "risk name", "probability": "high/medium/low", "impact": "high/medium/low", "mitigation": "strategy"}}
    ],
    "exit_strategy": "description of potential exit strategies",
    "milestones": [
      {{"milestone": "milestone name", "target_date": "Month X", "metric": "how to measure success"}}
    ]
  }}
}}"""

        result = await self._generate_json(prompt, temperature=0.4)
        self.execution_end = datetime.now(timezone.utc)

        return {
            "agent": self.agent_name,
            "data": result,
            "tokens_used": self.tokens_used,
            "provider": self.provider_used,
            "model": self.model_used,
            "duration_ms": self._get_duration_ms(),
        }


class ExecutionMasterAgent(BaseAgent):
    """Master Agent for Finance, Marketing, Advertisement, and Analytics"""

    @property
    def agent_name(self) -> str:
        return "execution_master"

    @property
    def role(self) -> str:
        return "Elite Startup Execution Consultant"

    @property
    def goal(self) -> str:
        return "Provide financial projections, marketing strategy, ad campaigns, and CEO analytics in one step"

    @property
    def system_prompt(self) -> str:
        return """You are an elite Startup Execution Consultant combining the roles of a CFO, CMO, Performance Marketer, and AI CEO Analyst.
You create detailed financial models, comprehensive marketing strategies, high-converting ad campaigns, and objective business health scores.
Always use realistic numbers based on the industry and budget. Format responses as valid JSON with numbers as integers/floats where appropriate."""

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        self.execution_start = datetime.now(timezone.utc)
        logger.info(f"ExecutionMasterAgent starting execution")

        project_summary = self._build_context_summary(context)
        project = context.get("project", {})
        currency = project.get("budget_currency", "INR")
        budget = project.get("budget", 50000)
        industry = project.get("industry", "general")
        risk = project.get("risk_appetite", "medium")
        timeline = project.get("timeline", "12 months")
        
        # Strategy data comes from previous agent
        strategy_data = context.get("strategy_master_data", {})
        business_plan = strategy_data.get("business_plan", {})
        research = strategy_data.get("research", {})
        competitor = strategy_data.get("competitor", {})

        risk_guidance = {
            "low": "conservative projections, lower CAC",
            "medium": "balanced projections",
            "high": "aggressive projections, rapid growth",
        }.get(risk, "balanced projections")

        prompt = f"""Create the execution and financial plan for this startup:

{project_summary}

Market Size: {research.get('market_size', 'N/A')}
Competitors: {len(competitor.get('competitors', []))} identified
Revenue Model: {business_plan.get('revenue_model', 'N/A')}
Value Prop: {business_plan.get('value_proposition', 'N/A')}

Risk Guidance: {risk_guidance}
Timeline: {timeline}.
Budget: {budget} {currency}

Return a JSON object with EXACTLY this structure (for finance numbers, use numbers ONLY - no strings):
{{
  "finance": {{
    "startup_costs": {{
      "total": 50000,
      "breakdown": [{{"item": "cost item", "amount": 5000, "category": "category", "one_time": true}}]
    }},
    "monthly_costs": {{
      "total": 8000,
      "breakdown": [{{"item": "cost item", "amount": 500, "category": "category"}}]
    }},
    "revenue_forecast": [
      {{"month": 1, "revenue": 2000, "customers": 5, "avg_revenue_per_customer": 400}}
    ],
    "profit_forecast": [
      {{"month": 1, "revenue": 2000, "costs": 8000, "profit": -6000, "margin": -300}}
    ],
    "cashflow_forecast": [
      {{"month": 1, "inflow": 2000, "outflow": 58000, "net": -56000, "cumulative": -56000}}
    ],
    "breakeven_analysis": {{
      "breakeven_month": 5,
      "breakeven_revenue": 8800,
      "breakeven_customers": 22,
      "fixed_costs_monthly": 7000,
      "variable_cost_per_customer": 80,
      "contribution_margin": 320
    }},
    "roi_estimation": {{
      "initial_investment": 50000,
      "year1_roi": -60,
      "year2_roi": 120,
      "year3_roi": 280,
      "payback_period_months": 14,
      "npv_3year": 85000,
      "irr": 45
    }},
    "financial_ratios": {{
      "gross_margin": 75,
      "net_margin_year1": -15,
      "net_margin_year2": 25,
      "customer_ltv": 2400,
      "customer_cac": 200,
      "ltv_cac_ratio": 12,
      "monthly_burn_rate": 8000
    }},
    "funding_requirements": {{
      "total_needed": 75000,
      "runway_months": 9,
      "use_of_funds": [
        {{"purpose": "Product", "amount": 20000, "percentage": 27}}
      ]
    }},
    "summary_metrics": {{
      "year1_total_revenue": 184500,
      "year1_total_profit": -10200,
      "year2_projected_revenue": 650000,
      "year2_projected_profit": 162500,
      "annual_growth_rate": 252
    }},
    "currency": "{currency}"
  }},
  "marketing": {{
    "instagram_posts": [
      {{"type": "type", "caption": "caption", "hashtags": ["#tag"], "image_concept": "image", "cta": "cta"}}
    ],
    "linkedin_posts": [
      {{"type": "type", "content": "content", "cta": "cta"}}
    ],
    "twitter_posts": [
      {{"tweet": "tweet", "thread": ["tweet 1"] }}
    ],
    "facebook_posts": [
      {{"type": "type", "content": "content", "cta": "cta"}}
    ],
    "email_campaigns": [
      {{"campaign": "name", "subject": "subject", "preview": "preview", "body": "body", "cta": "cta", "target_segment": "segment"}}
    ],
    "marketing_strategy": {{
      "positioning": "positioning",
      "key_messages": ["message"],
      "brand_voice": "voice",
      "channels": [{{"channel": "channel", "priority": "primary", "budget_percent": 20, "strategy": "strategy"}}]
    }},
    "content_calendar": [
      {{"week": 1, "theme": "theme", "posts": [{{"platform": "platform", "day": "Monday", "type": "type", "topic": "topic"}}]}}
    ],
    "lead_gen_strategy": {{
      "tactics": ["tactic"],
      "lead_magnet": "magnet",
      "funnel": ["awareness"]
    }},
    "seo_strategy": {{
      "target_keywords": ["keyword"],
      "content_topics": ["topic"],
      "backlink_strategy": "backlink",
      "local_seo": "local seo"
    }},
    "growth_hacking_plan": [
      {{"tactic": "tactic", "description": "description", "expected_result": "result", "effort": "low", "impact": "high"}}
    ],
    "hashtags": {{
      "brand": ["#brand"],
      "industry": ["#industry"],
      "trending": ["#trending"],
      "campaign": ["#campaign"]
    }}
  }},
  "advertisement": {{
    "google_ads": {{
      "search_campaigns": [
        {{
          "campaign_name": "name",
          "keywords": ["keyword"],
          "headlines": ["headline"],
          "descriptions": ["description"],
          "display_url": "/path"
        }}
      ],
      "display_ads": [
        {{"size": "300x250", "headline": "headline", "description": "description", "cta": "cta"}}
      ]
    }},
    "facebook_ads": [
      {{
        "campaign_objective": "awareness",
        "audience": "audience",
        "ad_format": "single_image",
        "primary_text": "text",
        "headline": "headline",
        "description": "description",
        "cta": "cta"
      }}
    ],
    "instagram_ads": [
      {{
        "format": "feed",
        "visual_concept": "concept",
        "caption": "caption",
        "cta": "cta",
        "audience": "audience"
      }}
    ],
    "linkedin_ads": [
      {{
        "format": "sponsored_content",
        "headline": "headline",
        "intro_text": "intro",
        "cta": "cta",
        "targeting": "targeting"
      }}
    ],
    "retargeting_ads": [
      {{
        "audience": "audience",
        "message": "message",
        "offer": "offer",
        "platform": "platform"
      }}
    ],
    "headlines": ["headline"],
    "cta_variations": ["cta"],
    "budget_recommendations": {{
      "total_monthly": 5000,
      "allocation": [
        {{"platform": "Google Ads", "amount": 2000, "percentage": 40, "rationale": "rationale"}}
      ]
    }},
    "campaign_structure": {{
      "phase1": {{"duration": "Month 1-2", "focus": "awareness", "budget": 3000, "kpi": "reach"}}
    }}
  }},
  "analytics": {{
    "scores": {{
      "health_score": 72,
      "market_opportunity_score": 81,
      "competition_score": 65,
      "financial_health_score": 68,
      "marketing_score": 75,
      "readiness_score": 70,
      "risk_score": 58,
      "growth_score": 77,
      "overall_score": 71
    }},
    "score_explanations": {{
      "health_score": "explanation",
      "market_opportunity_score": "explanation",
      "competition_score": "explanation",
      "financial_health_score": "explanation",
      "marketing_score": "explanation",
      "readiness_score": "explanation",
      "risk_score": "explanation",
      "growth_score": "explanation"
    }},
    "ceo_recommendations": [
      {{"priority": "critical", "recommendation": "recommendation", "timeline": "immediate", "expected_impact": "impact"}}
    ],
    "risk_alerts": [
      {{"alert": "alert", "severity": "critical", "action": "action"}}
    ],
    "growth_opportunities": [
      {{"opportunity": "opportunity", "potential_roi": "high", "time_to_implement": "short", "required_resources": "resources"}}
    ],
    "weekly_action_plan": {{
      "week1": ["action1"],
      "week2": ["action2"],
      "week3": ["action3"],
      "week4": ["action4"]
    }},
    "key_metrics_to_track": [
      {{"metric": "metric", "target": "target", "why_it_matters": "why"}}
    ]
  }}
}}"""

        result = await self._generate_json(prompt, temperature=0.4)
        self.execution_end = datetime.now(timezone.utc)

        return {
            "agent": self.agent_name,
            "data": result,
            "tokens_used": self.tokens_used,
            "provider": self.provider_used,
            "model": self.model_used,
            "duration_ms": self._get_duration_ms(),
        }
