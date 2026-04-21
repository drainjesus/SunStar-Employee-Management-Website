-- Extend attendance special requests to support richer request details.
-- Safe to run multiple times in development.

alter table if exists public.attendance_special_requests
  add column if not exists request_date_to date,
  add column if not exists time_from text,
  add column if not exists time_to text,
  add column if not exists business_type text,
  add column if not exists special_holiday text;

update public.attendance_special_requests
set request_date_to = request_date
where request_date_to is null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'attendance_special_requests_request_type_check'
      and conrelid = 'public.attendance_special_requests'::regclass
  ) then
    alter table public.attendance_special_requests
      drop constraint attendance_special_requests_request_type_check;
  end if;
end $$;

alter table if exists public.attendance_special_requests
  add constraint attendance_special_requests_request_type_check
  check (request_type in ('Overtime', 'Special Work', 'Special Holiday Work', 'Official Business'));

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'attendance_special_requests_status_check'
      and conrelid = 'public.attendance_special_requests'::regclass
  ) then
    alter table public.attendance_special_requests
      drop constraint attendance_special_requests_status_check;
  end if;
end $$;

alter table if exists public.attendance_special_requests
  add constraint attendance_special_requests_status_check
  check (status in ('Pending', 'Approved', 'Rejected', 'Declined'));
