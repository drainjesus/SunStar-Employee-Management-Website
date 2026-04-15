-- Add extended employee profile fields for admin records.
-- Run in Supabase SQL Editor after the base schema scripts.

alter table if exists public.employees
  add column if not exists middle_name text,
  add column if not exists birth_date date,
  add column if not exists marital_status text,
  add column if not exists employment_status text,
  add column if not exists address text;
