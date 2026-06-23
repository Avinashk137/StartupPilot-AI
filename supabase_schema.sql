-- Supabase Backend Tables Setup for StartupPilot AI

-- 1. Create Projects Table
CREATE TABLE public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_idea TEXT NOT NULL,
    industry TEXT NOT NULL,
    country TEXT NOT NULL,
    state TEXT,
    target_audience TEXT,
    budget NUMERIC,
    budget_currency TEXT DEFAULT 'USD',
    goals TEXT,
    business_stage TEXT DEFAULT 'idea',
    risk_appetite TEXT DEFAULT 'medium',
    timeline TEXT,
    status TEXT DEFAULT 'draft',
    progress_percent INTEGER DEFAULT 0,
    current_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 2. Create Activity Timeline Table
CREATE TABLE public.activity_timeline (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Notifications Table
CREATE TABLE public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Agent Logs Table
CREATE TABLE public.agent_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    status TEXT DEFAULT 'running',
    ai_provider TEXT,
    ai_model TEXT,
    tokens_used INTEGER DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    output_summary TEXT,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Report Tables
-- Note: we use `raw_data` JSONB to hold all dynamic output, simplifying schema updates.

CREATE TABLE public.research_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
    status TEXT DEFAULT 'pending',
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.competitor_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
    status TEXT DEFAULT 'pending',
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.business_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
    status TEXT DEFAULT 'pending',
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.financial_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
    status TEXT DEFAULT 'pending',
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.marketing_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
    status TEXT DEFAULT 'pending',
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.advertisements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
    status TEXT DEFAULT 'pending',
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics Reports needs explicit columns since they're queried for dashboard stats
CREATE TABLE public.analytics_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
    status TEXT DEFAULT 'pending',
    health_score NUMERIC DEFAULT 0,
    market_opportunity_score NUMERIC DEFAULT 0,
    competition_score NUMERIC DEFAULT 0,
    financial_health_score NUMERIC DEFAULT 0,
    marketing_score NUMERIC DEFAULT 0,
    readiness_score NUMERIC DEFAULT 0,
    risk_score NUMERIC DEFAULT 0,
    growth_score NUMERIC DEFAULT 0,
    overall_score NUMERIC DEFAULT 0,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) policies 
-- Enable RLS for all tables so data is isolated by user
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_reports ENABLE ROW LEVEL SECURITY;

-- Base Policies mapping `auth.uid()` to user data
CREATE POLICY "Users can manage their own projects" ON public.projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own timeline" ON public.activity_timeline FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- For agent logs and reports, link ownership through the project table
CREATE POLICY "Users can manage logs for their projects" ON public.agent_logs FOR ALL USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view research reports for their projects" ON public.research_reports FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));
CREATE POLICY "Users can view competitor reports for their projects" ON public.competitor_reports FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));
CREATE POLICY "Users can view business plans for their projects" ON public.business_plans FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));
CREATE POLICY "Users can view financial reports for their projects" ON public.financial_reports FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));
CREATE POLICY "Users can view marketing reports for their projects" ON public.marketing_reports FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));
CREATE POLICY "Users can view advertisements for their projects" ON public.advertisements FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));
CREATE POLICY "Users can view analytics reports for their projects" ON public.analytics_reports FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));
