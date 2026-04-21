-- Training & Development employee-submitted entries
-- Run in Supabase SQL editor

create table if not exists public.training_development_entries (
  id bigint primary key,
  employee_id bigint not null references public.employees(id) on delete cascade,
  training_title text not null,
  date_from date,
  date_to date,
  certificate_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  if not exists (select 1 from pg_trigger where tgname = 'trg_training_development_entries_updated_at') then
    create trigger trg_training_development_entries_updated_at before update on public.training_development_entries
    for each row execute function public.set_updated_at();
  end if;
end $$;
