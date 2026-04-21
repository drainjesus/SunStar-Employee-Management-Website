alter table public.training_development_entries
  add column if not exists certificate_data_url text null;
