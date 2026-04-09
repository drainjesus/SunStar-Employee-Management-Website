-- SunStar Davao HR System - Extended Subsystem Tables
-- Run AFTER 01_supabase_schema.sql

create extension if not exists pgcrypto;

-- Admin accounts (separate from employees)
create table if not exists public.admin_accounts (
  id bigint generated always as identity primary key,
  full_name text not null,
  email text unique not null,
  password text not null,
  role text not null default 'Super Admin',
  status text not null default 'Active',
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep employee records linked to admin actions
alter table public.employees
  add column if not exists created_by_admin_id bigint references public.admin_accounts(id) on delete set null;

alter table public.employees
  add column if not exists updated_by_admin_id bigint references public.admin_accounts(id) on delete set null;

-- Employee settings module
create table if not exists public.employee_settings (
  employee_id bigint primary key references public.employees(id) on delete cascade,
  timezone text default 'Asia/Manila',
  language text default 'en',
  notification_preferences jsonb not null default '{}'::jsonb,
  privacy_preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Admin settings module
create table if not exists public.admin_settings (
  admin_id bigint not null references public.admin_accounts(id) on delete cascade,
  setting_key text not null,
  setting_value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (admin_id, setting_key)
);

-- Training enrollments (normalized)
create table if not exists public.training_enrollments (
  id uuid primary key default gen_random_uuid(),
  training_id bigint not null references public.training_programs(id) on delete cascade,
  employee_id bigint not null references public.employees(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  completion_status text not null default 'Enrolled',
  completed_at timestamptz,
  unique (training_id, employee_id)
);

-- Employee skills (normalized)
create table if not exists public.employee_skills (
  id uuid primary key default gen_random_uuid(),
  employee_id bigint not null references public.employees(id) on delete cascade,
  skill_name text not null,
  source_training_id bigint references public.training_programs(id) on delete set null,
  verified_by_admin_id bigint references public.admin_accounts(id) on delete set null,
  verified_at timestamptz,
  unique (employee_id, skill_name)
);

-- Employee certifications (normalized)
create table if not exists public.employee_certifications (
  id bigint primary key,
  employee_id bigint not null references public.employees(id) on delete cascade,
  certification_name text not null,
  issue_date date,
  expiry_date date,
  issuer text,
  verified_by_admin_id bigint references public.admin_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Leave file attachments (file-a-leave supporting data)
create table if not exists public.leave_attachments (
  id uuid primary key default gen_random_uuid(),
  leave_request_id bigint not null references public.leave_requests(id) on delete cascade,
  file_url text not null,
  file_name text,
  uploaded_at timestamptz not null default now()
);

-- Attendance admin actions (manual overrides/sanctions)
create table if not exists public.attendance_actions (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid references public.attendance_records(id) on delete cascade,
  employee_id bigint references public.employees(id) on delete cascade,
  action_type text not null,
  action_note text,
  acted_by_admin_id bigint references public.admin_accounts(id) on delete set null,
  acted_at timestamptz not null default now()
);

-- Performance goals and development plans
create table if not exists public.performance_goals (
  id uuid primary key default gen_random_uuid(),
  employee_id bigint not null references public.employees(id) on delete cascade,
  title text not null,
  description text,
  target_date date,
  status text not null default 'Open',
  created_by_admin_id bigint references public.admin_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reports and analytics data
create table if not exists public.report_exports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null,
  generated_by_admin_id bigint references public.admin_accounts(id) on delete set null,
  filter_payload jsonb not null default '{}'::jsonb,
  file_url text,
  status text not null default 'Generated',
  generated_at timestamptz not null default now()
);

create table if not exists public.analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  module_name text not null,
  metric_key text not null,
  metric_value numeric(14,2),
  metric_payload jsonb not null default '{}'::jsonb,
  captured_by_admin_id bigint references public.admin_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (snapshot_date, module_name, metric_key)
);

-- Cross-module audit trail
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null,
  actor_id bigint,
  module_name text not null,
  action_name text not null,
  record_ref text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Ensure updated_at function exists
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Attach updated_at triggers for new tables that have updated_at
-- Note: Trigger names are unique per table for idempotent reruns.
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_admin_accounts_updated_at') then
    create trigger trg_admin_accounts_updated_at before update on public.admin_accounts
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_employee_settings_updated_at') then
    create trigger trg_employee_settings_updated_at before update on public.employee_settings
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_admin_settings_updated_at') then
    create trigger trg_admin_settings_updated_at before update on public.admin_settings
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_employee_certifications_updated_at') then
    create trigger trg_employee_certifications_updated_at before update on public.employee_certifications
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_performance_goals_updated_at') then
    create trigger trg_performance_goals_updated_at before update on public.performance_goals
    for each row execute function public.set_updated_at();
  end if;
end $$;
