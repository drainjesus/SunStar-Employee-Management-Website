-- Migration: Add date_from, date_to, and documents columns to leave_requests table
-- This allows storing date ranges and uploaded document references for leave requests

alter table public.leave_requests
add column date_from date,
add column date_to date,
add column documents jsonb not null default '[]'::jsonb;

-- Create an index on date_from and date_to for better query performance
create index if not exists idx_leave_requests_date_from on public.leave_requests(date_from);
create index if not exists idx_leave_requests_date_to on public.leave_requests(date_to);
