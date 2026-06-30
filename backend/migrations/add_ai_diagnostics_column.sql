-- Add AI Diagnostics & Caching columns to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS input_hash TEXT,
ADD COLUMN IF NOT EXISTS ai_diagnostics JSONB;
