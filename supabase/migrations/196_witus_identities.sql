-- 196_witus_identities.sql
-- Maps a WitUS account (OIDC `sub` from accounts.witus.online) to a Work.WitUS Supabase user.
-- The "Sign in with WitUS" callback (app/api/auth/witus/callback) links by email on first login,
-- then by this row thereafter. Only the server (service role) reads/writes it.
--
-- SHARED DATABASE. This is a byte-for-byte copy of CentenarianOS's
-- supabase/migrations/20260630120000_witus_identities.sql. The two apps share one Supabase project
-- (see SHARED_DB.md), so the table almost certainly already exists — `if not exists` makes running
-- this a no-op in that case, and SHARED_DB.md rule 3 ("copy new migrations to both repos") is why
-- it is carried here at all rather than left implicit.

create table if not exists public.witus_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  witus_sub text not null unique,
  created_at timestamptz not null default now()
);

-- RLS on with no policies => only the service-role server bypasses it. No client ever needs to
-- read this table directly.
alter table public.witus_identities enable row level security;
