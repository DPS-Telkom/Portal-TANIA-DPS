-- TANIA migration 9 — Copilot guardrails (AV-05, AV-06; decision 2026-09-27)
-- * Per-user daily chat quota and daily briefing-refresh quota, admin-editable.
-- * copilot_briefings.generation_count: how many times today's briefing was
--   generated (1 = first, +1 per forced refresh), enforced by tania-assistant.

insert into public.app_settings (key, value, label) values
  ('copilot_daily_message_limit', 50, 'Copilot: maksimal pertanyaan chat per user per hari'),
  ('copilot_daily_briefing_limit', 5, 'Copilot: maksimal pembuatan briefing per user per hari (termasuk refresh)')
on conflict (key) do nothing;

alter table public.copilot_briefings
  add column generation_count smallint not null default 1 check (generation_count between 1 and 100);
