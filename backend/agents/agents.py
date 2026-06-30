"""
agents.py -- Master Prompt Builder

Single responsibility: build prompts for the AI orchestrator.

Architecture:
  - ONE combined master prompt returns all 7 sections in a single AI call
  - Targeted section mini-prompts for regenerating only failed/empty sections
  - No individual agent classes needed -- the orchestrator handles execution
"""
from typing import Dict, Any, Optional, List


SECTION_REQUIRED_KEYS = {
    "research": ["market_size", "tam", "growth_rate", "pain_points", "opportunities"],
    "competitor": ["competitors", "market_gaps", "swot_analysis", "competitive_advantages"],
    "business_plan": ["executive_summary", "mission", "value_proposition", "revenue_model", "growth_strategy"],
    "finance": ["startup_costs", "monthly_costs", "revenue_forecast", "profit_forecast", "breakeven_analysis"],
    "marketing": ["instagram_posts", "linkedin_posts", "marketing_strategy", "seo_strategy"],
}

SECTION_KEYS = list(SECTION_REQUIRED_KEYS.keys())


def build_context_summary(project: dict) -> str:
    """Build a text summary of the project for AI prompts."""
    risk = project.get("risk_appetite", "medium")
    risk_map = {
        "low":    "Conservative -- safe, steady, low-risk strategies with stable growth",
        "medium": "Balanced -- moderate risk with balanced growth and investment strategies",
        "high":   "Aggressive -- high-risk, high-reward strategies; rapid, bold growth",
    }
    risk_desc = risk_map.get(risk, risk_map["medium"])
    currency = project.get("budget_currency", "INR")
    budget = project.get("budget", "N/A")
    timeline = project.get("timeline", "N/A")
    state = project.get("state", "")
    country = project.get("country", "India")
    location = f"{state}, {country}" if state else country

    return "\n".join([
        f"Business Name: {project.get('business_name', 'N/A')}",
        f"Business Idea: {project.get('business_idea', 'N/A')}",
        f"Industry: {project.get('industry', 'N/A')}",
        f"Location: {location}",
        f"Target Audience: {project.get('target_audience', 'N/A')}",
        f"Budget: {currency} {budget}",
        f"Currency: {currency} (use this currency for ALL financial figures)",
        f"Business Stage: {project.get('business_stage', 'idea')}",
        f"Risk Appetite: {risk.upper()} -- {risk_desc}",
        f"Timeline: {timeline}",
        f"Goals: {project.get('goals', 'N/A')}",
        "",
        "CRITICAL INSTRUCTIONS:",
        f"- ALL monetary values MUST be in {currency}",
        f"- Strategies MUST reflect the {risk.upper()} risk appetite",
        f"- Market analysis MUST focus on the {location} region",
        f"- Financial projections MUST align with a {timeline} timeline",
    ])


class MasterPromptBuilder:
    """
    Builds the single master prompt that generates all 5 sections in one AI call.

    Returns a JSON object with keys: research, competitor, business_plan,
    finance, marketing
    """

    SYSTEM_PROMPT = """You are an elite startup consultant combining the expertise of:
- Market Research Specialist (15+ years)
- Competitor Intelligence Analyst
- Business Strategy Consultant (MBA, 100+ startups)
- CFO/Financial Advisor (200+ startup financial models)
- CMO / Growth Marketer

Your job: produce a COMPLETE, DETAILED startup analysis for the given business.
Provide specific, realistic numbers. Be thorough and business-focused.
ALL monetary values must use the currency specified in the project data.
RESPOND WITH ONLY A VALID JSON OBJECT. No markdown, no explanations."""

    def build_master_prompt(self, project: dict, missing_sections: Optional[List[str]] = None) -> str:
        ctx = build_context_summary(project)
        currency = project.get("budget_currency", "INR")
        state = project.get("state", "")
        country = project.get("country", "India")
        location = f"{state}, {country}" if state else country
        risk = project.get("risk_appetite", "medium")
        budget = project.get("budget", 50000)
        industry = project.get("industry", "general")
        timeline = project.get("timeline", "12 months")

        risk_finance = {
            "low":    "conservative: slow steady growth, minimal debt, prefer profitability over growth speed",
            "medium": "balanced: moderate growth, reinvest profits strategically",
            "high":   "aggressive: rapid growth, invest heavily in acquisition, prioritize market share",
        }.get(risk, "balanced projections")


        sections_to_generate = missing_sections if missing_sections else SECTION_KEYS
        schema_chunks = {}

        schema_chunks["research"] = f"""  "research": {{
    "market_size": "total market size with {currency}",
    "tam": "Total Addressable Market in {location} in {currency}",
    "sam": "Serviceable Addressable Market in {currency}",
    "som": "Serviceable Obtainable Market first-year estimate in {currency}",
    "growth_rate": "Annual market growth rate %",
    "growth_trends": [
      {{"trend": "name", "description": "detail for {location}", "impact": "high/medium/low"}}
    ],
    "customer_segments": [
      {{"segment": "name", "size": "% of market", "description": "who they are in {location}", "pain_points": ["pain1", "pain2"]}}
    ],
    "pain_points": ["pain1", "pain2", "pain3", "pain4", "pain5"],
    "opportunities": [
      {{"opportunity": "name", "description": "detail for {location}", "potential": "high/medium/low"}}
    ],
    "risks": [
      {{"risk": "name", "description": "detail", "severity": "high/medium/low", "mitigation": "strategy"}}
    ],
    "recommendations": ["rec1", "rec2", "rec3", "rec4"],
    "key_insights": ["insight1 for {location}", "insight2", "insight3"]
  }}"""

        schema_chunks["competitor"] = f"""  "competitor": {{
    "competitors": [
      {{
        "name": "competitor name",
        "type": "direct/indirect",
        "website": "website.com",
        "description": "brief description",
        "pricing": "pricing model and range in {currency}",
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
      "strengths": ["strength1", "strength2", "strength3"],
      "weaknesses": ["weakness1", "weakness2"],
      "opportunities": ["opportunity1", "opportunity2", "opportunity3"],
      "threats": ["threat1", "threat2", "threat3"]
    }},
    "competitive_advantages": ["advantage1", "advantage2", "advantage3"],
    "pricing_analysis": {{
      "market_average": "typical pricing in {currency}",
      "our_recommended_price": "suggested pricing in {currency}",
      "rationale": "why this pricing makes sense"
    }},
    "recommendations": ["rec1", "rec2", "rec3"]
  }}"""

        schema_chunks["business_plan"] = f"""  "business_plan": {{
    "executive_summary": "compelling 2-3 paragraph business overview",
    "mission": "mission statement (1-2 sentences)",
    "vision": "vision for 5-10 year future",
    "target_market": "detailed description of primary target market",
    "customer_segments": [
      {{"segment": "name", "description": "who they are", "size": "percentage", "acquisition_strategy": "how to reach"}}
    ],
    "value_proposition": "clear unique value proposition",
    "revenue_model": [
      {{"stream": "name", "description": "how it works", "pricing": "price in {currency}", "margin": "expected margin %"}}
    ],
    "pricing_strategy": {{
      "model": "pricing model type",
      "tiers": [{{"tier": "name", "price": "amount in {currency}", "features": ["feature1", "feature2"]}}],
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
      "technology": ["tech1", "tech2"],
      "processes": ["process1", "process2"]
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
      {{"risk": "name", "probability": "high/medium/low", "impact": "high/medium/low", "mitigation": "strategy"}}
    ],
    "exit_strategy": "potential exit strategies description",
    "milestones": [
      {{"milestone": "name", "target_date": "Month X", "metric": "how to measure"}}
    ]
  }}"""

        schema_chunks["finance"] = f"""  "finance": {{
    "startup_costs": {{
      "total": 50000,
      "breakdown": [{{"item": "name", "amount": 5000, "category": "technology/marketing/operations/legal", "one_time": true}}]
    }},
    "monthly_costs": {{
      "total": 8000,
      "breakdown": [{{"item": "name", "amount": 500, "category": "salaries/marketing/technology/rent/other"}}]
    }},
    "revenue_forecast": [
      {{"month": 1, "revenue": 2000, "customers": 5, "avg_revenue_per_customer": 400}},
      {{"month": 6, "revenue": 12000, "customers": 30, "avg_revenue_per_customer": 400}},
      {{"month": 12, "revenue": 35000, "customers": 82, "avg_revenue_per_customer": 427}}
    ],
    "profit_forecast": [
      {{"month": 1, "revenue": 2000, "costs": 8000, "profit": -6000, "margin": -300}},
      {{"month": 6, "revenue": 12000, "costs": 9000, "profit": 3000, "margin": 25}},
      {{"month": 12, "revenue": 35000, "costs": 12000, "profit": 23000, "margin": 66}}
    ],
    "cashflow_forecast": [
      {{"month": 1, "inflow": 2000, "outflow": 58000, "net": -56000, "cumulative": -56000}},
      {{"month": 6, "inflow": 12000, "outflow": 9000, "net": 3000, "cumulative": -62000}},
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
        {{"purpose": "Product Development", "amount": 20000, "percentage": 27}}
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
  }}"""

        schema_chunks["marketing"] = f"""  "marketing": {{
    "instagram_posts": [
      {{"type": "launch/promotional/educational", "caption": "full caption text", "hashtags": ["#tag1", "#tag2"], "image_concept": "what the image should show", "cta": "call to action"}}
    ],
    "linkedin_posts": [
      {{"type": "thought_leadership/company_update", "content": "full post content", "cta": "call to action"}}
    ],
    "twitter_posts": [
      {{"tweet": "tweet under 280 chars", "thread": ["tweet1", "tweet2"]}}
    ],
    "facebook_posts": [
      {{"type": "post type", "content": "full post content", "cta": "call to action"}}
    ],
    "email_campaigns": [
      {{"campaign": "name", "subject": "subject line", "preview": "preview text", "body": "email body", "cta": "call to action", "target_segment": "who receives this"}}
    ],
    "marketing_strategy": {{
      "positioning": "brand positioning statement",
      "key_messages": ["message1", "message2", "message3"],
      "brand_voice": "tone and personality description",
      "channels": [{{"channel": "name", "priority": "primary/secondary", "budget_percent": 20, "strategy": "approach"}}]
    }},
    "content_calendar": [
      {{"week": 1, "theme": "launch week", "posts": [{{"platform": "instagram", "day": "Monday", "type": "announcement", "topic": "post topic"}}]}}
    ],
    "lead_gen_strategy": {{
      "tactics": ["tactic1", "tactic2", "tactic3"],
      "lead_magnet": "lead magnet description",
      "funnel": ["awareness", "interest", "consideration", "conversion"]
    }},
    "seo_strategy": {{
      "target_keywords": ["keyword1", "keyword2", "keyword3"],
      "content_topics": ["topic1", "topic2", "topic3"],
      "backlink_strategy": "approach to building backlinks",
      "local_seo": "local SEO tactics"
    }},
    "growth_hacking_plan": [
      {{"tactic": "name", "description": "how it works", "expected_result": "what we expect", "effort": "low/medium/high", "impact": "low/medium/high"}}
    ],
    "hashtags": {{
      "brand": ["#brandhashtag"],
      "industry": ["#industry1"],
      "trending": ["#trending1"],
      "campaign": ["#campaign1"]
    }}
  }}"""


        requested_chunks = [schema_chunks[key] for key in sections_to_generate if key in schema_chunks]
        json_schema = "{\n" + ",\n".join(requested_chunks) + "\n}"

        return f"""Analyze this startup and produce a COMPLETE business intelligence report.

{ctx}

Return ONE JSON object with EXACTLY these {len(sections_to_generate)} keys. Be thorough -- each section must be complete.

{json_schema}

IMPORTANT -- Adjust ALL numbers realistically:
- Budget: {currency} {budget} (use this as the baseline for all financial projections)
- Industry: {industry} (industry-specific cost and revenue benchmarks)
- Location: {location} (regional market data and pricing)
- Risk: {risk.upper()} -- {risk_finance}
- Timeline: {timeline} (align all forecasts to this timeline)

Generate complete, realistic data for ALL 5 sections. Do not skip or abbreviate any section."""

    def build_section_prompt(self, section: str, project: dict) -> str:
        """Build a targeted mini-prompt to regenerate a single missing/failed section."""
        ctx = build_context_summary(project)
        currency = project.get("budget_currency", "INR")
        state = project.get("state", "")
        country = project.get("country", "India")
        location = f"{state}, {country}" if state else country
        risk = project.get("risk_appetite", "medium")
        budget = project.get("budget", 50000)
        industry = project.get("industry", "general")
        timeline = project.get("timeline", "12 months")

        section_builders = {
            "research": self._research_prompt,
            "competitor": self._competitor_prompt,
            "business_plan": self._business_plan_prompt,
            "finance": self._finance_prompt,
            "marketing": self._marketing_prompt,
        }

        builder = section_builders.get(section)
        if not builder:
            raise ValueError(f"Unknown section: {section}")

        return builder(ctx, currency, location, risk, budget, industry, timeline)

    def _research_prompt(self, ctx, currency, location, risk, budget, industry, timeline) -> str:
        return f"""Conduct market research for this startup:

{ctx}

Return ONLY a JSON object (no other text) with this structure:
{{
  "market_size": "total market size in {currency}",
  "tam": "Total Addressable Market in {location} in {currency}",
  "sam": "Serviceable Addressable Market in {currency}",
  "som": "Serviceable Obtainable Market first-year estimate in {currency}",
  "growth_rate": "Annual growth rate %",
  "growth_trends": [{{"trend": "name", "description": "detail for {location}", "impact": "high/medium/low"}}],
  "customer_segments": [{{"segment": "name", "size": "% of market", "description": "who they are", "pain_points": ["pain1"]}}],
  "pain_points": ["pain1", "pain2", "pain3", "pain4", "pain5"],
  "opportunities": [{{"opportunity": "name", "description": "detail", "potential": "high/medium/low"}}],
  "risks": [{{"risk": "name", "description": "detail", "severity": "high/medium/low", "mitigation": "strategy"}}],
  "recommendations": ["rec1", "rec2", "rec3", "rec4"],
  "key_insights": ["insight1", "insight2", "insight3"]
}}"""

    def _competitor_prompt(self, ctx, currency, location, risk, budget, industry, timeline) -> str:
        return f"""Analyze the competitive landscape for this startup:

{ctx}

Return ONLY a JSON object with this structure:
{{
  "competitors": [{{
    "name": "name", "type": "direct/indirect", "website": "site.com",
    "description": "brief description", "pricing": "pricing in {currency}",
    "services": ["s1"], "strengths": ["s1"], "weaknesses": ["w1"],
    "market_share": "position", "target_market": "who they serve"
  }}],
  "market_gaps": [{{"gap": "description", "opportunity": "how to capitalize", "size": "large/medium/small"}}],
  "swot_analysis": {{
    "strengths": ["s1", "s2"], "weaknesses": ["w1"],
    "opportunities": ["o1", "o2"], "threats": ["t1"]
  }},
  "competitive_advantages": ["adv1", "adv2", "adv3"],
  "pricing_analysis": {{
    "market_average": "typical pricing in {currency}",
    "our_recommended_price": "suggested price in {currency}",
    "rationale": "why this pricing makes sense"
  }},
  "recommendations": ["rec1", "rec2", "rec3"]
}}"""

    def _business_plan_prompt(self, ctx, currency, location, risk, budget, industry, timeline) -> str:
        return f"""Create a comprehensive business plan for this startup:

{ctx}

Return ONLY a JSON object with this structure:
{{
  "executive_summary": "2-3 paragraph compelling overview",
  "mission": "mission statement",
  "vision": "5-10 year vision",
  "target_market": "detailed target market description",
  "customer_segments": [{{"segment": "name", "description": "who they are", "size": "%", "acquisition_strategy": "how to reach"}}],
  "value_proposition": "unique value proposition",
  "revenue_model": [{{"stream": "name", "description": "how it works", "pricing": "price in {currency}", "margin": "%"}}],
  "pricing_strategy": {{
    "model": "model type",
    "tiers": [{{"tier": "name", "price": "amount in {currency}", "features": ["f1"]}}],
    "rationale": "why this works"
  }},
  "sales_plan": {{"channels": ["c1"], "strategy": "approach", "targets": [{{"period": "Month 1-3", "goal": "goal"}}]}},
  "marketing_plan": {{"strategy": "approach", "channels": ["c1"], "budget_allocation": {{"digital": "40%", "content": "30%", "partnerships": "30%"}}}},
  "operations_plan": {{
    "team": [{{"role": "role", "responsibilities": "what they do", "timing": "when to hire"}}],
    "technology": ["tech1"], "processes": ["process1"]
  }},
  "growth_strategy": {{
    "phase1": {{"period": "0-6 months", "focus": "focus", "milestones": ["m1"]}},
    "phase2": {{"period": "6-18 months", "focus": "focus", "milestones": ["m1"]}},
    "phase3": {{"period": "18-36 months", "focus": "focus", "milestones": ["m1"]}}
  }},
  "swot_analysis": {{"strengths": ["s1"], "weaknesses": ["w1"], "opportunities": ["o1"], "threats": ["t1"]}},
  "risk_analysis": [{{"risk": "name", "probability": "high/medium/low", "impact": "high/medium/low", "mitigation": "strategy"}}],
  "exit_strategy": "exit strategies description",
  "milestones": [{{"milestone": "name", "target_date": "Month X", "metric": "how to measure"}}]
}}"""

    def _finance_prompt(self, ctx, currency, location, risk, budget, industry, timeline) -> str:
        risk_guidance = {
            "low":    "conservative: slow steady growth, lower CAC, prefer profitability",
            "medium": "balanced: moderate growth, reinvest profits strategically",
            "high":   "aggressive: rapid growth, invest heavily in acquisition",
        }.get(risk, "balanced")

        return f"""Create financial projections for this startup:

{ctx}

Risk guidance: {risk_guidance}
Timeline: {timeline}
Budget: {currency} {budget}
Industry: {industry}

Return ONLY a JSON object with numbers ONLY (no currency symbols in numeric fields):
{{
  "startup_costs": {{
    "total": 50000,
    "breakdown": [{{"item": "name", "amount": 5000, "category": "technology/marketing/operations/legal", "one_time": true}}]
  }},
  "monthly_costs": {{
    "total": 8000,
    "breakdown": [{{"item": "name", "amount": 500, "category": "salaries/marketing/technology/rent/other"}}]
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
    "breakeven_month": 5, "breakeven_revenue": 8800, "breakeven_customers": 22,
    "fixed_costs_monthly": 7000, "variable_cost_per_customer": 80, "contribution_margin": 320
  }},
  "roi_estimation": {{
    "initial_investment": 50000, "year1_roi": -60, "year2_roi": 120, "year3_roi": 280,
    "payback_period_months": 14, "npv_3year": 85000, "irr": 45
  }},
  "financial_ratios": {{
    "gross_margin": 75, "net_margin_year1": -15, "net_margin_year2": 25,
    "customer_ltv": 2400, "customer_cac": 200, "ltv_cac_ratio": 12, "monthly_burn_rate": 8000
  }},
  "funding_requirements": {{
    "total_needed": 75000, "runway_months": 9,
    "use_of_funds": [
      {{"purpose": "Product Development", "amount": 20000, "percentage": 27}},
      {{"purpose": "Marketing & Sales", "amount": 25000, "percentage": 33}},
      {{"purpose": "Operations", "amount": 15000, "percentage": 20}},
      {{"purpose": "Working Capital", "amount": 15000, "percentage": 20}}
    ]
  }},
  "summary_metrics": {{
    "year1_total_revenue": 184500, "year1_total_profit": -10200,
    "year2_projected_revenue": 650000, "year2_projected_profit": 162500, "annual_growth_rate": 252
  }},
  "currency": "{currency}"
}}

Adjust ALL numbers realistically for: budget={currency} {budget}, industry={industry}, risk={risk.upper()}."""

    def _marketing_prompt(self, ctx, currency, location, risk, budget, industry, timeline) -> str:
        return f"""Create a comprehensive marketing strategy for this startup:

{ctx}

Return ONLY a JSON object:
{{
  "instagram_posts": [{{"type": "type", "caption": "full caption", "hashtags": ["#tag"], "image_concept": "concept", "cta": "cta"}}],
  "linkedin_posts": [{{"type": "type", "content": "full post content", "cta": "cta"}}],
  "twitter_posts": [{{"tweet": "tweet text", "thread": ["t1", "t2"]}}],
  "facebook_posts": [{{"type": "type", "content": "full content", "cta": "cta"}}],
  "email_campaigns": [{{"campaign": "name", "subject": "subject", "preview": "preview text", "body": "email body", "cta": "cta", "target_segment": "segment"}}],
  "marketing_strategy": {{
    "positioning": "positioning statement",
    "key_messages": ["msg1", "msg2", "msg3"],
    "brand_voice": "tone description",
    "channels": [{{"channel": "name", "priority": "primary/secondary", "budget_percent": 20, "strategy": "approach"}}]
  }},
  "content_calendar": [{{"week": 1, "theme": "theme", "posts": [{{"platform": "instagram", "day": "Monday", "type": "type", "topic": "topic"}}]}}],
  "lead_gen_strategy": {{"tactics": ["tactic1", "tactic2"], "lead_magnet": "description", "funnel": ["awareness", "interest", "consideration", "conversion"]}},
  "seo_strategy": {{
    "target_keywords": ["kw1", "kw2", "kw3", "kw4", "kw5"],
    "content_topics": ["topic1", "topic2"],
    "backlink_strategy": "approach",
    "local_seo": "local tactics for {location}"
  }},
  "growth_hacking_plan": [{{"tactic": "name", "description": "how it works", "expected_result": "result", "effort": "low/medium/high", "impact": "low/medium/high"}}],
  "hashtags": {{"brand": ["#brand"], "industry": ["#industry"], "trending": ["#trending"], "campaign": ["#campaign"]}}
}}"""

