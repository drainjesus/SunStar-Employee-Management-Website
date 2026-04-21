-- Development-only policy for attendance_special_requests.
-- WARNING: Permissive policy for prototype environments only.

alter table public.attendance_special_requests enable row level security;

drop policy if exists attendance_special_requests_dev_all on public.attendance_special_requests;

create policy attendance_special_requests_dev_all
on public.attendance_special_requests
for all
using (true)
with check (true);
