-- Add shift schedule field for attendance special requests.
-- Run this if attendance_special_requests already exists from earlier migration.

alter table if exists public.attendance_special_requests
  add column if not exists shift_schedule text not null default 'Newsroom Day Shift (08:00 AM - 05:00 PM)';
