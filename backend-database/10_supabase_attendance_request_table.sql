-- Create table for OT, Special Work, and Official Business approval workflow.

create table if not exists public.attendance_special_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id bigint references public.employees(id) on delete cascade,
  employee_name text not null,
  request_date date not null,
  request_type text not null check (request_type in ('Overtime', 'Special Work', 'Official Business')),
  requested_hours numeric(6,2) not null default 0,
  shift_schedule text not null default 'Newsroom Day Shift (08:00 AM - 05:00 PM)',
  reason text not null,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  decision_note text,
  decided_by text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_attendance_special_requests_employee_date
  on public.attendance_special_requests (employee_id, request_date desc);

create index if not exists idx_attendance_special_requests_status_date
  on public.attendance_special_requests (status, request_date desc);

do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    if not exists (
      select 1 from pg_trigger where tgname = 'trg_attendance_special_requests_updated_at'
    ) then
      create trigger trg_attendance_special_requests_updated_at
      before update on public.attendance_special_requests
      for each row execute function public.set_updated_at();
    end if;
  end if;
end $$;
