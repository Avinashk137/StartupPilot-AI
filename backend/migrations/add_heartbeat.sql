-- Add heartbeat column to projects table to support watchdog auto-recovery
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS heartbeat TIMESTAMPTZ DEFAULT NOW();

-- Create an index to make the watchdog query extremely fast since it polls every 10s
CREATE INDEX IF NOT EXISTS idx_projects_status_heartbeat 
ON public.projects (status, heartbeat);
