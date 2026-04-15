-- Add attendance sanction fields visible to employees.
-- Run in Supabase SQL Editor after prior schema scripts.

alter table if exists public.attendance_records
  add column if not exists sanction_message text,
  add column if not exists sanction_by text,
  add column if not exists sanction_at timestamptz;
