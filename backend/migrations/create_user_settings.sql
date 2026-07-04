-- Migration: Create user_settings table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.user_settings (
    id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id                 UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Appearance
    theme                   TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    
    -- AI Preferences
    ai_quality              TEXT NOT NULL DEFAULT 'balanced' CHECK (ai_quality IN ('fast', 'balanced', 'high')),
    ai_provider             TEXT NOT NULL DEFAULT 'auto' CHECK (ai_provider IN ('auto', 'openai', 'gemini')),
    
    -- AI Retry
    auto_retry              BOOLEAN NOT NULL DEFAULT TRUE,
    max_retries             INTEGER NOT NULL DEFAULT 3 CHECK (max_retries IN (1, 2, 3, 5)),
    retry_delay_seconds     INTEGER NOT NULL DEFAULT 10 CHECK (retry_delay_seconds IN (5, 10, 30)),
    
    -- Notifications
    email_notifications     BOOLEAN NOT NULL DEFAULT TRUE,
    ai_notifications        BOOLEAN NOT NULL DEFAULT TRUE,
    weekly_reports          BOOLEAN NOT NULL DEFAULT FALSE,
    browser_notifications   BOOLEAN NOT NULL DEFAULT FALSE,
    desktop_notifications   BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Report Preferences
    default_download_format TEXT NOT NULL DEFAULT 'pdf' CHECK (default_download_format IN ('pdf', 'markdown')),
    open_reports_in         TEXT NOT NULL DEFAULT 'current' CHECK (open_reports_in IN ('current', 'new_tab')),
    auto_save_reports       BOOLEAN NOT NULL DEFAULT TRUE,
    auto_backup_reports     BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Project Preferences
    date_format             TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    project_sorting         TEXT NOT NULL DEFAULT 'newest' CHECK (project_sorting IN ('newest', 'oldest', 'alphabetical', 'last_updated')),
    default_status_filter   TEXT NOT NULL DEFAULT 'all' CHECK (default_status_filter IN ('all', 'draft', 'processing', 'completed', 'partial', 'failed')),
    
    -- Performance
    parallel_agents         BOOLEAN NOT NULL DEFAULT TRUE,
    smart_cache             BOOLEAN NOT NULL DEFAULT TRUE,
    background_processing   BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Security
    session_timeout         TEXT NOT NULL DEFAULT '1h' CHECK (session_timeout IN ('15m', '30m', '1h', 'never')),
    remember_login          BOOLEAN NOT NULL DEFAULT TRUE,
    token_version           INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on every update
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_settings_updated_at ON public.user_settings;
CREATE TRIGGER user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION update_user_settings_updated_at();

-- Row Level Security: users can only access their own settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies (backend uses service role key which bypasses RLS, so these are for direct client access)
CREATE POLICY "Users can read own settings"
    ON public.user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
    ON public.user_settings FOR ALL
    USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS user_settings_user_id_idx ON public.user_settings(user_id);
