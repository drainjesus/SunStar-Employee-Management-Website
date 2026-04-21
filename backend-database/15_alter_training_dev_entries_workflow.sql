alter table public.training_development_entries
  add column if not exists submission_type text not null default 'catalog',
  add column if not exists program_id bigint null,
  add column if not exists provider_name text null,
  add column if not exists status text not null default 'Pending',
  add column if not exists review_note text null,
  add column if not exists reviewed_by text null,
  add column if not exists reviewed_at timestamptz null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'training_development_entries_program_id_fkey'
  ) then
    alter table public.training_development_entries
      add constraint training_development_entries_program_id_fkey
      foreign key (program_id) references public.training_programs(id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'training_development_entries_submission_type_check'
  ) then
    alter table public.training_development_entries
      add constraint training_development_entries_submission_type_check
      check (submission_type in ('catalog', 'external'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'training_development_entries_status_check'
  ) then
    alter table public.training_development_entries
      add constraint training_development_entries_status_check
      check (status in ('Pending', 'Approved', 'Declined'));
  end if;
end $$;

create index if not exists idx_training_development_entries_status
  on public.training_development_entries(status);
