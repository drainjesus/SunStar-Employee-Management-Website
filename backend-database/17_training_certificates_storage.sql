alter table public.training_development_entries
  add column if not exists certificate_url text null,
  add column if not exists certificate_storage_path text null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'training-certificates',
  'training-certificates',
  true,
  10485760,
  array['application/pdf', 'image/png', 'image/jpeg']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists training_certificates_public_read on storage.objects;
drop policy if exists training_certificates_public_insert on storage.objects;
drop policy if exists training_certificates_public_update on storage.objects;

create policy training_certificates_public_read
  on storage.objects
  for select
  using (bucket_id = 'training-certificates');

create policy training_certificates_public_insert
  on storage.objects
  for insert
  with check (bucket_id = 'training-certificates');

create policy training_certificates_public_update
  on storage.objects
  for update
  using (bucket_id = 'training-certificates')
  with check (bucket_id = 'training-certificates');
