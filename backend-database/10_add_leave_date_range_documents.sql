-- Migration: Add Date Range and Documents to Leave Requests
-- This migration ensures the leave_requests table has all the necessary columns
-- for date range (date_from, date_to) and documents support

-- Add date_from column if it doesn't exist
ALTER TABLE IF EXISTS public.leave_requests
ADD COLUMN IF NOT EXISTS date_from date;

-- Add date_to column if it doesn't exist
ALTER TABLE IF EXISTS public.leave_requests
ADD COLUMN IF NOT EXISTS date_to date;

-- Modify documents column if needed (ensure it's jsonb)
ALTER TABLE IF EXISTS public.leave_requests
ADD COLUMN IF NOT EXISTS documents jsonb not null default '[]'::jsonb;

-- Update existing records where date_from and date_to are NULL
-- Use date_of_leave as the base for both dates if they're not set
UPDATE public.leave_requests
SET date_from = COALESCE(date_from, date_of_leave)
WHERE date_from IS NULL AND date_of_leave IS NOT NULL;

UPDATE public.leave_requests
SET date_to = COALESCE(date_to, date_of_leave)
WHERE date_to IS NULL AND date_of_leave IS NOT NULL;

-- Create index on date_from and date_to for better query performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_date_from 
ON public.leave_requests(date_from);

CREATE INDEX IF NOT EXISTS idx_leave_requests_date_to 
ON public.leave_requests(date_to);

-- Add comment to document the migration
COMMENT ON COLUMN public.leave_requests.date_from IS 'Start date of the leave period';
COMMENT ON COLUMN public.leave_requests.date_to IS 'End date of the leave period';
COMMENT ON COLUMN public.leave_requests.documents IS 'Supporting documents in JSON array format';
