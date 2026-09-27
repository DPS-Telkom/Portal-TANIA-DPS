-- TANIA migration 8 — Feasibility & Budget support (PF-03, BC-02, BC-05)
--
-- 1. feasibility_resource_check(case_id): per required competency, how many
--    people have ≥50% free capacity in EVERY month of the case period, and
--    the smallest total free FTE across those months. Built on
--    staffing_candidates(), security invoker (caller's RLS applies).
-- 2. Budget entries may only link to a feasibility case decided `go`
--    (decision 2026-09-27). Entries without a case link stay allowed.
-- 3. budget_monthly: committed/realized per line per month (burn rate).

-- ---------------------------------------------------------------------------
-- 1. Resource check (PF-03)
-- status: cukup   — at least `headcount` people with ≥50% free every month
--         parsial — not enough such people, but total free FTE ≥ headcount
--         kurang  — neither
-- ---------------------------------------------------------------------------
create or replace function public.feasibility_resource_check(p_case_id uuid)
returns table (
  skill_id                 uuid,
  skill_name               text,
  min_level                smallint,
  headcount                smallint,
  months                   int,
  period_start             date,
  min_candidates           int,
  min_free_fte             numeric,
  status                   text
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with c as (
    select coalesce(fc.start_month, date_trunc('month', current_date)::date) as start_month,
           least(greatest(coalesce(fc.est_duration_months, 1), 1), 12) as duration
    from public.feasibility_cases fc
    where fc.id = p_case_id
  ),
  period as (
    select (c.start_month + make_interval(months => i))::date as m
    from c, generate_series(0, c.duration - 1) as i
  ),
  req as (
    select r.skill_id, s.name, r.min_level, r.headcount
    from public.feasibility_required_skills r
    join public.skills s on s.id = r.skill_id
    where r.case_id = p_case_id
  ),
  per_month as (
    select req.skill_id, period.m,
           count(sc.profile_id) filter (where sc.available_pct >= 50) as candidates,
           coalesce(sum(sc.available_pct), 0) / 100.0 as free_fte
    from req
    cross join period
    left join lateral public.staffing_candidates(req.skill_id, req.min_level, period.m) sc on true
    group by req.skill_id, period.m
  )
  select
    req.skill_id,
    req.name,
    req.min_level,
    req.headcount,
    count(pm.m)::int,
    (select start_month from c),
    min(pm.candidates)::int,
    round(min(pm.free_fte), 2),
    case
      when min(pm.candidates) >= req.headcount then 'cukup'
      when min(pm.free_fte) >= req.headcount then 'parsial'
      else 'kurang'
    end
  from req
  join per_month pm on pm.skill_id = req.skill_id
  group by req.skill_id, req.name, req.min_level, req.headcount
  order by req.name;
$$;

revoke all on function public.feasibility_resource_check(uuid) from public, anon;
grant execute on function public.feasibility_resource_check(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Budget entries link only to `go` cases
-- ---------------------------------------------------------------------------
create or replace function public.budget_entry_case_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.feasibility_case_id is not null
     and (tg_op = 'INSERT' or new.feasibility_case_id is distinct from old.feasibility_case_id)
     and (select decision from public.feasibility_cases where id = new.feasibility_case_id)
         is distinct from 'go' then
    raise exception 'budget entries can only link to a feasibility case decided GO'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function public.budget_entry_case_guard() from public, anon, authenticated;

create trigger budget_entries_case_guard before insert or update on public.budget_entries
  for each row execute function public.budget_entry_case_guard();

-- ---------------------------------------------------------------------------
-- 3. budget_monthly (BC-05 burn rate) — security invoker, so talent sees nothing
-- ---------------------------------------------------------------------------
create view public.budget_monthly
with (security_invoker = true) as
select
  e.budget_line_id,
  l.fiscal_year,
  l.program,
  l.category,
  date_trunc('month', e.entry_date)::date as period_month,
  coalesce(sum(e.amount) filter (where e.entry_type = 'commitment'), 0)::numeric(18,2) as committed,
  coalesce(sum(e.amount) filter (where e.entry_type = 'realization'), 0)::numeric(18,2) as realized
from public.budget_entries e
join public.budget_lines l on l.id = e.budget_line_id
group by e.budget_line_id, l.fiscal_year, l.program, l.category, date_trunc('month', e.entry_date);
