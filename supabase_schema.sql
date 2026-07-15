-- ============================================================
-- StartupPilot AI — Canonical Database Schema
-- ============================================================
-- This is the single source of truth for all Supabase tables.
-- Run this in the Supabase SQL editor (Project Settings → SQL Editor).
--
-- It is idempotent: safe to run multiple times (uses IF NOT EXISTS).
-- ============================================================


-- ── 1. Projects Table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name   TEXT NOT NULL,
    business_idea   TEXT NOT NULL,
    industry        TEXT NOT NULL,
    country         TEXT NOT NULL,
    state           TEXT,
    target_audience TEXT,
    budget          NUMERIC,
    budget_currency TEXT DEFAULT 'INR',
    goals           TEXT,
    business_stage  TEXT DEFAULT 'idea',
    risk_appetite   TEXT DEFAULT 'medium',
    timeline        TEXT,
    status          TEXT DEFAULT 'draft',
    progress_percent INTEGER DEFAULT 0,
    current_agent   TEXT,
    error_message   TEXT,
    -- Timestamps
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at    TIMESTAMP WITH TIME ZONE,
    -- Cache invalidation
    input_hash      TEXT,
    -- Watchdog: heartbeat is updated every step to detect stalls
    heartbeat       TIMESTAMP WITH TIME ZONE,
    -- Per-agent diagnostics (JSON map: section → {status, error})
    ai_diagnostics  JSONB
);

-- Add heartbeat column if upgrading from old schema
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS heartbeat TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS input_hash TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ai_diagnostics JSONB;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS budget_currency TEXT DEFAULT 'INR';


-- ── 2. Activity Timeline Table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_timeline (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id  UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action      TEXT NOT NULL,
    details     JSONB,
    icon        TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ── 3. Notifications Table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id        UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    title             TEXT NOT NULL,
    message           TEXT NOT NULL,
    notification_type TEXT DEFAULT 'info',
    is_read           BOOLEAN DEFAULT FALSE,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ── 4. Agent Logs Table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_logs (
    id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id     UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    agent_name     TEXT NOT NULL,
    status         TEXT DEFAULT 'running',
    ai_provider    TEXT,
    ai_model       TEXT,
    tokens_used    INTEGER DEFAULT 0,
    duration_ms    INTEGER DEFAULT 0,
    output_summary TEXT,
    error_message  TEXT,
    started_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at   TIMESTAMP WITH TIME ZONE,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ── 5. Analysis Jobs Table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.analysis_jobs (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id    UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status        TEXT DEFAULT 'pending',
    current_agent TEXT,
    error_message TEXT,
    started_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at  TIMESTAMP WITH TIME ZONE
);


-- ── 6. Report Tables ──────────────────────────────────────────────────────────
-- All report tables share the same structure. `raw_data` holds all dynamic
-- agent output as JSONB, keeping the schema stable as the AI output evolves.
-- `version` and `previous_versions` support regeneration history.

CREATE TABLE IF NOT EXISTS public.research_reports (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id        UUID REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
    status            TEXT DEFAULT 'pending',
    raw_data          JSONB,
    provider_used     TEXT,
    runtime_ms        INTEGER DEFAULT 0,
    retry_count       INTEGER DEFAULT 0,
    version           INTEGER DEFAULT 1,
    previous_versions JSONB DEFAULT '[]'::jsonb,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.competitor_reports (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id        UUID REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
    status            TEXT DEFAULT 'pending',
    raw_data          JSONB,
    provider_used     TEXT,
    runtime_ms        INTEGER DEFAULT 0,
    retry_count       INTEGER DEFAULT 0,
    version           INTEGER DEFAULT 1,
    previous_versions JSONB DEFAULT '[]'::jsonb,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.business_plans (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id        UUID REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
    status            TEXT DEFAULT 'pending',
    raw_data          JSONB,
    provider_used     TEXT,
    runtime_ms        INTEGER DEFAULT 0,
    retry_count       INTEGER DEFAULT 0,
    version           INTEGER DEFAULT 1,
    previous_versions JSONB DEFAULT '[]'::jsonb,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.financial_reports (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id        UUID REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
    status            TEXT DEFAULT 'pending',
    raw_data          JSONB,
    provider_used     TEXT,
    runtime_ms        INTEGER DEFAULT 0,
    retry_count       INTEGER DEFAULT 0,
    version           INTEGER DEFAULT 1,
    previous_versions JSONB DEFAULT '[]'::jsonb,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.marketing_reports (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id        UUID REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
    status            TEXT DEFAULT 'pending',
    raw_data          JSONB,
    provider_used     TEXT,
    runtime_ms        INTEGER DEFAULT 0,
    retry_count       INTEGER DEFAULT 0,
    version           INTEGER DEFAULT 1,
    previous_versions JSONB DEFAULT '[]'::jsonb,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add versioning columns to existing report tables (idempotent)
ALTER TABLE public.research_reports   ADD COLUMN IF NOT EXISTS provider_used TEXT;
ALTER TABLE public.research_reports   ADD COLUMN IF NOT EXISTS runtime_ms INTEGER DEFAULT 0;
ALTER TABLE public.research_reports   ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE public.research_reports   ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE public.research_reports   ADD COLUMN IF NOT EXISTS previous_versions JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.competitor_reports ADD COLUMN IF NOT EXISTS provider_used TEXT;
ALTER TABLE public.competitor_reports ADD COLUMN IF NOT EXISTS runtime_ms INTEGER DEFAULT 0;
ALTER TABLE public.competitor_reports ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE public.competitor_reports ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE public.competitor_reports ADD COLUMN IF NOT EXISTS previous_versions JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.business_plans     ADD COLUMN IF NOT EXISTS provider_used TEXT;
ALTER TABLE public.business_plans     ADD COLUMN IF NOT EXISTS runtime_ms INTEGER DEFAULT 0;
ALTER TABLE public.business_plans     ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE public.business_plans     ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE public.business_plans     ADD COLUMN IF NOT EXISTS previous_versions JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.financial_reports  ADD COLUMN IF NOT EXISTS provider_used TEXT;
ALTER TABLE public.financial_reports  ADD COLUMN IF NOT EXISTS runtime_ms INTEGER DEFAULT 0;
ALTER TABLE public.financial_reports  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE public.financial_reports  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE public.financial_reports  ADD COLUMN IF NOT EXISTS previous_versions JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.marketing_reports  ADD COLUMN IF NOT EXISTS provider_used TEXT;
ALTER TABLE public.marketing_reports  ADD COLUMN IF NOT EXISTS runtime_ms INTEGER DEFAULT 0;
ALTER TABLE public.marketing_reports  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE public.marketing_reports  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE public.marketing_reports  ADD COLUMN IF NOT EXISTS previous_versions JSONB DEFAULT '[]'::jsonb;


-- ── 7. Exports Table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exports (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id   UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    project_name TEXT,
    industry     TEXT,
    country      TEXT,
    report_type  TEXT NOT NULL,   -- 'research', 'competitor', 'business_plan', 'finance', 'marketing'
    status       TEXT DEFAULT 'completed',
    content      JSONB,           -- snapshot of the report data at export time
    generated_by TEXT,            -- AI provider name
    version      INTEGER DEFAULT 1,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ── 8. User Settings Table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_settings (
    id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    -- AI preferences
    ai_quality            TEXT DEFAULT 'balanced',    -- 'fast', 'balanced', 'high'
    ai_provider           TEXT DEFAULT 'auto',        -- 'auto', 'gemini', 'openai', etc.
    auto_retry            BOOLEAN DEFAULT TRUE,
    max_retries           INTEGER DEFAULT 3,
    retry_delay_seconds   INTEGER DEFAULT 10,
    parallel_agents       BOOLEAN DEFAULT TRUE,
    -- Notification preferences
    email_notifications   BOOLEAN DEFAULT TRUE,
    -- Theme
    theme                 TEXT DEFAULT 'dark',
    -- Timestamps
    created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ── Row Level Security (RLS) ──────────────────────────────────────────────────
ALTER TABLE public.projects           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_timeline  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_jobs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_reports   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_plans     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_reports  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_reports  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exports            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings      ENABLE ROW LEVEL SECURITY;


-- ── RLS Policies ──────────────────────────────────────────────────────────────
-- Drop and recreate policies to ensure they're current (idempotent)

DO $$ BEGIN
  -- Projects
  DROP POLICY IF EXISTS "Users can manage their own projects" ON public.projects;
  CREATE POLICY "Users can manage their own projects"
    ON public.projects FOR ALL USING (auth.uid() = user_id);

  -- Activity Timeline
  DROP POLICY IF EXISTS "Users can manage their own timeline" ON public.activity_timeline;
  CREATE POLICY "Users can manage their own timeline"
    ON public.activity_timeline FOR ALL USING (auth.uid() = user_id);

  -- Notifications
  DROP POLICY IF EXISTS "Users can manage their own notifications" ON public.notifications;
  CREATE POLICY "Users can manage their own notifications"
    ON public.notifications FOR ALL USING (auth.uid() = user_id);

  -- Analysis Jobs
  DROP POLICY IF EXISTS "Users can manage their own analysis jobs" ON public.analysis_jobs;
  CREATE POLICY "Users can manage their own analysis jobs"
    ON public.analysis_jobs FOR ALL USING (auth.uid() = user_id);

  -- Agent Logs (through project ownership)
  DROP POLICY IF EXISTS "Users can manage logs for their projects" ON public.agent_logs;
  CREATE POLICY "Users can manage logs for their projects"
    ON public.agent_logs FOR ALL USING (
        project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
    );

  -- Research Reports
  DROP POLICY IF EXISTS "Users can view research reports for their projects" ON public.research_reports;
  CREATE POLICY "Users can view research reports for their projects"
    ON public.research_reports FOR ALL USING (
        project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
    );

  -- Competitor Reports
  DROP POLICY IF EXISTS "Users can view competitor reports for their projects" ON public.competitor_reports;
  CREATE POLICY "Users can view competitor reports for their projects"
    ON public.competitor_reports FOR ALL USING (
        project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
    );

  -- Business Plans
  DROP POLICY IF EXISTS "Users can view business plans for their projects" ON public.business_plans;
  CREATE POLICY "Users can view business plans for their projects"
    ON public.business_plans FOR ALL USING (
        project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
    );

  -- Financial Reports
  DROP POLICY IF EXISTS "Users can view financial reports for their projects" ON public.financial_reports;
  CREATE POLICY "Users can view financial reports for their projects"
    ON public.financial_reports FOR ALL USING (
        project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
    );

  -- Marketing Reports
  DROP POLICY IF EXISTS "Users can view marketing reports for their projects" ON public.marketing_reports;
  CREATE POLICY "Users can view marketing reports for their projects"
    ON public.marketing_reports FOR ALL USING (
        project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
    );

  -- Exports
  DROP POLICY IF EXISTS "Users can manage their own exports" ON public.exports;
  CREATE POLICY "Users can manage their own exports"
    ON public.exports FOR ALL USING (auth.uid() = user_id);

  -- User Settings
  DROP POLICY IF EXISTS "Users can manage their own settings" ON public.user_settings;
  CREATE POLICY "Users can manage their own settings"
    ON public.user_settings FOR ALL USING (auth.uid() = user_id);

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Policy setup error (may be safe to ignore): %', SQLERRM;
END $$;
