-- Add admin verification metadata to attendance records.
-- Run in Supabase SQL Editor after the base schema scripts.

alter table if exists public.attendance_records
  add column if not exists is_verified boolean not null default false,
  add column if not exists verified_by text,
  add column if not exists verified_at timestamptz,
  add column if not exists status_source text not null default 'system';
