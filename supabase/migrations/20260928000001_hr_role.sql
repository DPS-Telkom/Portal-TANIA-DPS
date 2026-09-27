-- TANIA migration 10 — HR / Talent Management role (PRD Addendum C, decision 2026-09-28).
-- Kept alone: a new enum value must be committed before any policy can use it.
alter type public.user_role add value if not exists 'hr' before 'admin';
