# Supabase Setup (SunStar Davao)

This folder bootstraps Supabase for the current HR portal.

## 1. Create Supabase Project
- Go to Supabase Dashboard.
- Create a new project.
- Save your `Project URL` and `anon public key`.

## 2. Run SQL Schema
- Open SQL Editor in Supabase.
- Run `01_supabase_schema.sql` first.
- Run `02_supabase_policies_dev.sql` for development browser access.
- Run `03_supabase_subsystem_tables.sql` to create extended subsystem tables (admin, settings, skills/certs, reports/analytics, audit).
- Run `04_supabase_policies_dev_extended.sql` to enable development policies for those new tables.

## 3. Configure Frontend Keys
- Copy `supabase-config.example.js` to `supabase-config.js`.
- Fill in your real project URL and anon key.

## 4. Add Script Tags to Pages (when ready)
Add these before each page's main app script:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="../backend-database/supabase-config.js"></script>
<script src="../backend-database/supabase-client.js"></script>
<script src="../backend-database/supabase-performance-service.js"></script>
```

Use path `../backend-database/...` from pages inside `admin/` or `employee/`.

## 5. Migration Approach
- Keep localStorage as fallback during rollout.
- Start by syncing `performance_records` and `peer_reviews` first.
- Then migrate employees, leave, attendance, and training tables.

## Notes
- Development policies are intentionally permissive. Tighten policies before production.
- Never expose service role key in browser files.
