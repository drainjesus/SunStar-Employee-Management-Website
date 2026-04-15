-- Add attendance shift schedule, overtime tracking, and holiday work fields.
-- Run in Supabase SQL Editor after prior schema scripts.

alter table if exists public.attendance_records
  add column if not exists shift_schedule text,
  add column if not exists overtime_hours numeric(6,2) not null default 0,
  add column if not exists is_holiday_work boolean not null default false;
