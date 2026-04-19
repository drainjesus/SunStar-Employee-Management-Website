-- Add history and hire/termination fields to employees table (safe migration)
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS date_hired date,
  ADD COLUMN IF NOT EXISTS date_terminated date,
  ADD COLUMN IF NOT EXISTS employment_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS role_history jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Backfill new date fields from existing date_started/date_ended when available
UPDATE public.employees
SET date_hired = date_started
WHERE date_hired IS NULL AND date_started IS NOT NULL;

UPDATE public.employees
SET date_terminated = date_ended
WHERE date_terminated IS NULL AND date_ended IS NOT NULL;
