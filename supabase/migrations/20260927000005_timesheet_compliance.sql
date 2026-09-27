-- TANIA migration 5 — Timesheet module support (TS-04, WA-02)
--
-- 1. utilization_monthly: approved LEAVE hours no longer count as work; they
--    reduce the month's capacity instead (decision 2026-09-27). Columns are
--    only appended, so `create or replace view` keeps existing consumers valid.
-- 2. timesheet_compliance(week_start): per-person weekly submission status for
--    the compliance card. SECURITY INVOKER — results follow the caller's RLS
--    and scope (self, direct reports, or everyone for lead/executive/admin).

-- ---------------------------------------------------------------------------
-- 1. utilization_monthly
-- ---------------------------------------------------------------------------
create or replace view public.utilization_monthly
with (security_invoker = true) as
with months as (
  select profile_id, date_trunc('month', work_date)::date as period_month
  from public.timesheets
  union
  select profile_id, period_month from public.allocations
),
actual as (
  select t.profile_id,
         date_trunc('month', t.work_date)::date as period_month,
         coalesce(sum(t.hours) filter (where a.category <> 'leave'), 0) as work_hours,
         coalesce(sum(t.hours) filter (where a.category = 'leave'), 0) as leave_hours
  from public.timesheets t
  join public.activities a on a.id = t.activity_id
  where t.status = 'approved'
  group by 1, 2
),
planned as (
  select profile_id, period_month, sum(percent) as planned_pct
  from public.allocations
  group by 1, 2
),
base as (
  select
    m.profile_id,
    m.period_month,
    coalesce(a.work_hours, 0) as work_hours,
    coalesce(a.leave_hours, 0) as leave_hours,
    c.base_capacity,
    greatest(c.base_capacity - coalesce(a.leave_hours, 0), 0) as capacity
  from months m
  cross join lateral (
    select (8 * count(*))::numeric as base_capacity
    from generate_series(m.period_month,
                         (m.period_month + interval '1 month' - interval '1 day')::date,
                         interval '1 day') as d
    where extract(isodow from d) < 6
  ) c
  left join actual a on a.profile_id = m.profile_id and a.period_month = m.period_month
)
select
  b.profile_id,
  p.full_name,
  p.squad,
  b.period_month,
  b.work_hours::numeric(8,2) as approved_hours,
  b.capacity::numeric(8,2) as capacity_hours,
  case when b.capacity > 0
       then round(b.work_hours / b.capacity * 100, 1)
  end as utilization_pct,
  coalesce(pl.planned_pct, 0)::numeric(6,2) as planned_pct,
  b.leave_hours::numeric(8,2) as leave_hours,
  b.base_capacity::numeric(8,2) as base_capacity_hours
from base b
join public.profiles p on p.id = b.profile_id
left join planned pl on pl.profile_id = b.profile_id and pl.period_month = b.period_month
where b.profile_id = auth.uid()
   or public.is_manager_of(b.profile_id)
   or public.has_role(array['chapter_lead', 'executive', 'admin']::public.user_role[]);

-- ---------------------------------------------------------------------------
-- 2. timesheet_compliance(week_start)
-- week_status: belum_isi | draft | rejected | submitted | approved
--   (worst state wins: rejected > draft > submitted > approved)
-- Expected submitters: active talent, pm, manager, chapter_lead.
-- ---------------------------------------------------------------------------
create or replace function public.timesheet_compliance(week_start date)
returns table (
  profile_id   uuid,
  full_name    text,
  email        text,
  squad        text,
  manager_id   uuid,
  total_hours  numeric,
  week_status  text
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    p.id,
    p.full_name,
    p.email,
    p.squad,
    p.manager_id,
    coalesce(sum(t.hours), 0)::numeric(6,2),
    case
      when count(t.id) = 0 then 'belum_isi'
      when bool_or(t.status = 'rejected') then 'rejected'
      when bool_or(t.status = 'draft') then 'draft'
      when bool_or(t.status = 'submitted') then 'submitted'
      else 'approved'
    end
  from public.profiles p
  left join public.timesheets t
    on t.profile_id = p.id
   and t.work_date between week_start and week_start + 6
  where extract(isodow from week_start) = 1
    and p.is_active
    and p.role in ('talent', 'pm', 'manager', 'chapter_lead')
    and (
      p.id = auth.uid()
      or public.is_manager_of(p.id)
      or public.has_role(array['chapter_lead', 'executive', 'admin']::public.user_role[])
    )
  group by p.id
  order by p.squad nulls last, p.full_name;
$$;

revoke all on function public.timesheet_compliance(date) from public, anon;
grant execute on function public.timesheet_compliance(date) to authenticated;
