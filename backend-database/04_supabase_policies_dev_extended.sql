-- Development-only policies for extended subsystem tables
-- Run AFTER 03_supabase_subsystem_tables.sql
-- WARNING: These policies are permissive for prototyping only.

alter table public.admin_accounts enable row level security;
alter table public.employee_settings enable row level security;
alter table public.admin_settings enable row level security;
alter table public.training_enrollments enable row level security;
alter table public.employee_skills enable row level security;
alter table public.employee_certifications enable row level security;
alter table public.leave_attachments enable row level security;
alter table public.attendance_actions enable row level security;
alter table public.performance_goals enable row level security;
alter table public.report_exports enable row level security;
alter table public.analytics_snapshots enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists admin_accounts_dev_all on public.admin_accounts;
drop policy if exists employee_settings_dev_all on public.employee_settings;
drop policy if exists admin_settings_dev_all on public.admin_settings;
drop policy if exists training_enrollments_dev_all on public.training_enrollments;
drop policy if exists employee_skills_dev_all on public.employee_skills;
drop policy if exists employee_certifications_dev_all on public.employee_certifications;
drop policy if exists leave_attachments_dev_all on public.leave_attachments;
drop policy if exists attendance_actions_dev_all on public.attendance_actions;
drop policy if exists performance_goals_dev_all on public.performance_goals;
drop policy if exists report_exports_dev_all on public.report_exports;
drop policy if exists analytics_snapshots_dev_all on public.analytics_snapshots;
drop policy if exists audit_logs_dev_all on public.audit_logs;

create policy admin_accounts_dev_all on public.admin_accounts for all using (true) with check (true);
create policy employee_settings_dev_all on public.employee_settings for all using (true) with check (true);
create policy admin_settings_dev_all on public.admin_settings for all using (true) with check (true);
create policy training_enrollments_dev_all on public.training_enrollments for all using (true) with check (true);
create policy employee_skills_dev_all on public.employee_skills for all using (true) with check (true);
create policy employee_certifications_dev_all on public.employee_certifications for all using (true) with check (true);
create policy leave_attachments_dev_all on public.leave_attachments for all using (true) with check (true);
create policy attendance_actions_dev_all on public.attendance_actions for all using (true) with check (true);
create policy performance_goals_dev_all on public.performance_goals for all using (true) with check (true);
create policy report_exports_dev_all on public.report_exports for all using (true) with check (true);
create policy analytics_snapshots_dev_all on public.analytics_snapshots for all using (true) with check (true);
create policy audit_logs_dev_all on public.audit_logs for all using (true) with check (true);
