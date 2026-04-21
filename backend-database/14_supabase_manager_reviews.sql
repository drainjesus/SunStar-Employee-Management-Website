-- Employee-to-manager review table for performance module.
-- Safe to run repeatedly in development.

create table if not exists public.manager_reviews (
  employee_id bigint primary key references public.employees(id) on delete cascade,
  employee_name text not null,
  leadership integer not null check (leadership between 1 and 5),
  communication integer not null check (communication between 1 and 5),
  support integer not null check (support between 1 and 5),
  average numeric(3,1) not null,
  comment text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_manager_reviews_updated_at
  on public.manager_reviews (updated_at desc);
