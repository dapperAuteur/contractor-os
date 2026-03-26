-- 165_dashboard_widgets.sql
-- Store user's dashboard widget preferences as JSONB on profiles.
-- COPY THIS MIGRATION TO THE CENTENARIAN-OS REPO (per SHARED_DB.md).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dashboard_widgets JSONB NOT NULL DEFAULT '[]';

-- Format: [{ "id": "jobs-summary", "visible": true, "order": 0 }, ...]
-- Empty array = show default widgets
