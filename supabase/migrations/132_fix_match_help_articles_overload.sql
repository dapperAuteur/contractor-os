-- 132_fix_match_help_articles_overload.sql
-- Migration 130 used CREATE OR REPLACE FUNCTION with a new signature (added app_filter).
-- In PostgreSQL, this creates a NEW overload instead of replacing the old one, leaving
-- two versions: match_help_articles(vector,int,text) and match_help_articles(vector,int,text,text).
-- Supabase fails with "could not choose the best candidate function" when calling via RPC.
-- Fix: drop the old 3-argument version; the 4-argument version from migration 130 is correct.
-- COPY THIS MIGRATION TO THE CENTENARIAN-OS REPO (per SHARED_DB.md).

DROP FUNCTION IF EXISTS public.match_help_articles(vector, integer, text);
