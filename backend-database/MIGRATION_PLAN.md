# Migration Plan: localStorage -> Supabase

## Phase 1 (Now)
- Keep all existing UI flows.
- Add Supabase schema and dev policies.
- Add client/config templates.
- Performance module can use Supabase first.

## Phase 2
- Switch employee login validation to Supabase-backed `employees` table.
- Keep localStorage fallback while testing.

## Phase 3
- Move leave, attendance, and training modules to Supabase tables.
- Remove localStorage writes once all modules are stable.

## Data Mapping
- `sunstar_employees` -> `public.employees`
- `sunstar_attendance` -> `public.attendance_records`
- `sunstar_leaves` -> `public.leave_requests`
- `sunstar_trainings` -> `public.training_programs`
- `sunstar_performances` -> `public.performance_records`
- `sunstar_peer_reviews` -> `public.peer_reviews`
- `self_eval_<id>` -> `public.self_evaluations`
