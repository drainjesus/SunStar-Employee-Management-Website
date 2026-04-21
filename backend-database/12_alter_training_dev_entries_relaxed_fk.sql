-- Relax FK constraint for training development entries
-- Allows saving entries even when employees table is incomplete/mismatched.

alter table public.training_development_entries
  add column if not exists employee_name text;

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'training_development_entries'
      and constraint_name = 'training_development_entries_employee_id_fkey'
  ) then
    alter table public.training_development_entries
      drop constraint training_development_entries_employee_id_fkey;
  end if;
end $$;

alter table public.training_development_entries
  alter column employee_id drop not null;
