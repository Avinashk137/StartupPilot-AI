-- Migration: Create exports table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.exports (
    id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id              UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    
    project_name            TEXT,
    industry                TEXT,
    country                 TEXT,
    
    report_type             TEXT NOT NULL,
    status                  TEXT NOT NULL DEFAULT 'processing',
    
    content                 JSONB,
    markdown                TEXT,
    html                    TEXT,
    pdf_path                TEXT,
    
    generated_by            TEXT,
    version                 INTEGER DEFAULT 1,
    download_count          INTEGER DEFAULT 0,
    last_downloaded         TIMESTAMPTZ,
    
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    is_deleted              BOOLEAN DEFAULT FALSE
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_exports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS exports_updated_at ON public.exports;
CREATE TRIGGER exports_updated_at
    BEFORE UPDATE ON public.exports
    FOR EACH ROW EXECUTE FUNCTION update_exports_updated_at();

-- RLS Policies
ALTER TABLE public.exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own exports"
    ON public.exports FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exports"
    ON public.exports FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exports"
    ON public.exports FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exports"
    ON public.exports FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS exports_user_id_idx ON public.exports(user_id);
CREATE INDEX IF NOT EXISTS exports_project_id_idx ON public.exports(project_id);
CREATE INDEX IF NOT EXISTS exports_type_idx ON public.exports(report_type);
CREATE INDEX IF NOT EXISTS exports_status_idx ON public.exports(status);
