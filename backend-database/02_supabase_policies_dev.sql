-- Development-only policies for browser-based prototype
-- WARNING: These policies allow broad access. Tighten before production.

alter table public.employees enable row level security;
alter table public.attendance_records enable row level security;
alter table public.leave_requests enable row level security;
alter table public.training_programs enable row level security;
alter table public.training_development_entries enable row level security;
alter table public.performance_records enable row level security;
alter table public.peer_reviews enable row level security;
alter table public.self_evaluations enable row level security;

-- Drop existing broad policies if they already exist
drop policy if exists employees_dev_all on public.employees;
drop policy if exists attendance_dev_all on public.attendance_records;
drop policy if exists leave_dev_all on public.leave_requests;
drop policy if exists training_dev_all on public.training_programs;
drop policy if exists training_dev_entries_all on public.training_development_entries;
drop policy if exists performance_dev_all on public.performance_records;
drop policy if exists peer_reviews_dev_all on public.peer_reviews;
drop policy if exists self_eval_dev_all on public.self_evaluations;

create policy employees_dev_all on public.employees for all using (true) with check (true);
create policy attendance_dev_all on public.attendance_records for all using (true) with check (true);
create policy leave_dev_all on public.leave_requests for all using (true) with check (true);
create policy training_dev_all on public.training_programs for all using (true) with check (true);
create policy training_dev_entries_all on public.training_development_entries for all using (true) with check (true);
create policy performance_dev_all on public.performance_records for all using (true) with check (true);
create policy peer_reviews_dev_all on public.peer_reviews for all using (true) with check (true);
create policy self_eval_dev_all on public.self_evaluations for all using (true) with check (true);
