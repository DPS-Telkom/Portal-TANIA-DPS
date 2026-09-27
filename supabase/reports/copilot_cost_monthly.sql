-- AV-06 — Copilot monthly cost report. Run in the Supabase SQL Editor (as the
-- project owner). Aggregates token counts only; it never selects message or
-- briefing content, so chat privacy (AG-06) is preserved.
-- Prices: Claude Haiku 4.5, USD per 1M tokens (update if the price changes).

with prices as (
  select 1.00::numeric as usd_in_per_mtok, 5.00::numeric as usd_out_per_mtok, 16500::numeric as idr_per_usd
),
usage as (
  select date_trunc('month', created_at)::date as month, 'chat' as kind,
         coalesce(input_tokens, 0) as tin, coalesce(output_tokens, 0) as tout, user_id
  from public.chat_messages where role = 'assistant'
  union all
  select date_trunc('month', created_at)::date, 'briefing',
         coalesce(input_tokens, 0), coalesce(output_tokens, 0), user_id
  from public.copilot_briefings
)
select
  u.month,
  u.kind,
  count(*) as calls,
  count(distinct u.user_id) as users,
  sum(u.tin) as input_tokens,
  sum(u.tout) as output_tokens,
  round((sum(u.tin) * p.usd_in_per_mtok + sum(u.tout) * p.usd_out_per_mtok) / 1e6, 4) as usd,
  round((sum(u.tin) * p.usd_in_per_mtok + sum(u.tout) * p.usd_out_per_mtok) / 1e6 * p.idr_per_usd, 0) as idr
from usage u cross join prices p
group by u.month, u.kind, p.usd_in_per_mtok, p.usd_out_per_mtok, p.idr_per_usd
order by u.month desc, u.kind;
