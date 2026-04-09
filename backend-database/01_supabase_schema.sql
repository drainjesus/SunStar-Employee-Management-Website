-- SunStar Davao HR System - Supabase Schema
-- Run in Supabase SQL Editor

create extension if not exists pgcrypto;

create table if not exists public.employees (
  id bigint primary key,
  first_name text not null,
  last_name text not null,
  age integer,
  gender text,
  contact text,
  last_title text,
  date_started date,
  date_ended date,
  role text,
  salary numeric(12,2),
  emergency_name text,
  emergency_contact text,
  emergency_relation text,
  email text unique not null,
  password text not null,
  profile_pic text,
  skills jsonb not null default '[]'::jsonb,
  certs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  work_date date not null,
  employee_id bigint not null references public.employees(id) on delete cascade,
  employee_name text not null,
  clock_in text,
  clock_out text,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (work_date, employee_id)
);

create table if not exists public.leave_requests (
  id bigint primary key,
  employee_id bigint references public.employees(id) on delete set null,
  employee_name text not null,
  date_filed date,
  date_of_leave date,
  reason text,
  note text,
  days integer not null default 1,
  status text not null default 'Pending',
  time_filed text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_programs (
  id bigint primary key,
  name text not null,
  category text,
  training_date date,
  department text,
  description text,
  status text not null default 'Upcoming',
  enrollees jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.performance_records (
  id bigint primary key references public.employees(id) on delete cascade,
  employee_name text not null,
  role text,
  profile_pic text,
  manager_rating numeric(3,1),
  peer_avg numeric(3,1),
  breakdown jsonb,
  comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.peer_reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id bigint not null references public.employees(id) on delete cascade,
  target_id bigint not null references public.employees(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  updated_at timestamptz not null default now(),
  unique (reviewer_id, target_id)
);

create table if not exists public.self_evaluations (
  id uuid primary key default gen_random_uuid(),
  employee_id bigint not null references public.employees(id) on delete cascade,
  score numeric(3,1),
  note text,
  submitted_at timestamptz not null default now(),
  unique (employee_id)
);

-- Keep updated_at in sync
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_employees_updated_at') then
    create trigger trg_employees_updated_at before update on public.employees
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_attendance_updated_at') then
    create trigger trg_attendance_updated_at before update on public.attendance_records
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_leave_requests_updated_at') then
    create trigger trg_leave_requests_updated_at before update on public.leave_requests
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_training_programs_updated_at') then
    create trigger trg_training_programs_updated_at before update on public.training_programs
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_performance_records_updated_at') then
    create trigger trg_performance_records_updated_at before update on public.performance_records
    for each row execute function public.set_updated_at();
  end if;
end $$;
