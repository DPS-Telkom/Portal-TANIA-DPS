-- TANIA migration 7 — Talent & Workload support (TM-01..04, WA-01..04)
--
-- 1. Profile edit rights (decision 2026-09-27): squad and grade are set by an
--    admin or the person's direct manager. The owner edits only full_name and
--    location; a manager edits only squad and grade of direct reports.
-- 2. app_settings: admin-configurable thresholds (WA-03, BC-04).
-- 3. utilization_squad_monthly: heatmap source (WA-04), security invoker.
-- 4. staffing_candidates(): talent search by skill, level and month with
--    remaining capacity (TM-04; reused by PF-03 resource check and copilot).

-- ---------------------------------------------------------------------------
-- 1. Profiles: managers may update direct reports; guard narrows the columns
-- ---------------------------------------------------------------------------
create policy profiles_update_manager on public.profiles
  for update to authenticated
  using (public.is_manager_of(id))
  with check (public.is_manager_of(id));

create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  my_role public.user_role;
begin
  if auth.uid() is null then
    return new;  -- maintenance context (SQL editor, seed scripts)
  end if;

  if new.id is distinct from old.id then
    raise exception 'profile id is immutable' using errcode = '42501';
  end if;

  my_role := public.get_my_role();

  if my_role = 'admin' then
    -- An admin cannot demote or deactivate themselves (prevents lock-out).
    if new.id = auth.uid() and (new.role is distinct from old.role or new.is_active is distinct from old.is_active) then
      raise exception 'admin cannot change own role or active status' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.role       is distinct from old.role
  or new.is_active  is distinct from old.is_active
  or new.manager_id is distinct from old.manager_id
  or new.email      is distinct from old.email then
    raise exception 'only admin can change role, is_active, manager_id or email'
      using errcode = '42501';
  end if;

  if new.id = auth.uid() then
    if new.squad is distinct from old.squad or new.grade is distinct from old.grade then
      raise exception 'squad and grade are set by admin or your manager' using errcode = '42501';
    end if;
    if old.role = 'guest' and new.location is distinct from old.location then
      raise exception 'guest may only update full_name' using errcode = '42501';
    end if;
  else
    -- Direct manager (RLS already restricted the row): squad and grade only.
    if new.full_name is distinct from old.full_name
    or new.location  is distinct from old.location then
      raise exception 'manager may only change squad and grade' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_profile_privileges() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. app_settings — numeric thresholds, read by members, written by admin
-- ---------------------------------------------------------------------------
create table public.app_settings (
  key         text primary key,
  value       numeric not null,
  label       text not null,
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now(),
  constraint app_settings_value_range check (value >= 0 and value <= 1000)
);

insert into public.app_settings (key, value, label) values
  ('utilization_over_pct',  100, 'Overload: utilisasi/rencana di atas (%)'),
  ('utilization_under_pct',  60, 'Underload: utilisasi bulan selesai di bawah (%)'),
  ('budget_warning_pct',     80, 'Budget kuning: realisasi/komitmen mencapai (%)'),
  ('budget_critical_pct',   100, 'Budget merah: realisasi/komitmen mencapai (%)')
on conflict (key) do nothing;

create or replace function public.app_settings_stamp()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function public.app_settings_stamp() from public, anon, authenticated;

create trigger app_settings_stamp before insert or update on public.app_settings
  for each row execute function public.app_settings_stamp();
create trigger app_settings_audit after insert or update or delete on public.app_settings
  for each row execute function public.write_audit_log();

revoke all on public.app_settings from anon;
revoke insert, delete, truncate, references, trigger on public.app_settings from authenticated;

alter table public.app_settings enable row level security;

create policy app_settings_select on public.app_settings
  for select to authenticated using (public.is_member());
create policy app_settings_update on public.app_settings
  for update to authenticated
  using (public.has_role(array['admin']::public.user_role[]))
  with check (public.has_role(array['admin']::public.user_role[]));

-- ---------------------------------------------------------------------------
-- 3. utilization_squad_monthly (WA-04) — aggregates only what the caller may
--    see in utilization_monthly (security invoker end-to-end).
-- ---------------------------------------------------------------------------
create view public.utilization_squad_monthly
with (security_invoker = true) as
select
  coalesce(u.squad, 'Tanpa squad') as squad,
  u.period_month,
  count(*)::int as people,
  round(avg(u.utilization_pct), 1) as avg_utilization_pct,
  round(avg(u.planned_pct), 1) as avg_planned_pct,
  max(u.utilization_pct) as max_utilization_pct,
  max(u.planned_pct) as max_planned_pct,
  sum(u.approved_hours)::numeric(10,2) as approved_hours,
  sum(u.capacity_hours)::numeric(10,2) as capacity_hours
from public.utilization_monthly u
group by 1, 2;

-- ---------------------------------------------------------------------------
-- 4. staffing_candidates (TM-04)
--    Staffable people: active talent, pm, manager. With a skill, only those at
--    or above p_min_level. Ranked by remaining capacity, then proficiency.
-- ---------------------------------------------------------------------------
create or replace function public.staffing_candidates(
  p_skill_id  uuid default null,
  p_min_level int  default 1,
  p_month     date default date_trunc('month', current_date)::date
)
returns table (
  profile_id     uuid,
  full_name      text,
  email          text,
  squad          text,
  grade          text,
  role           public.user_role,
  skill_level    smallint,
  is_certified   boolean,
  allocated_pct  numeric,
  available_pct  numeric
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
    p.grade,
    p.role,
    ps.level,
    coalesce(ps.is_certified, false),
    coalesce(a.allocated, 0)::numeric(6,2),
    greatest(100 - coalesce(a.allocated, 0), 0)::numeric(6,2)
  from public.profiles p
  left join public.profile_skills ps
    on ps.profile_id = p.id and ps.skill_id = p_skill_id
  left join (
    select al.profile_id, sum(al.percent) as allocated
    from public.allocations al
    where al.period_month = p_month
    group by al.profile_id
  ) a on a.profile_id = p.id
  where public.is_member()
    and extract(day from p_month) = 1
    and p.is_active
    and p.role in ('talent', 'pm', 'manager')
    and (p_skill_id is null or ps.level >= greatest(p_min_level, 1))
  order by 10 desc, 7 desc nulls last, 2;
$$;

revoke all on function public.staffing_candidates(uuid, int, date) from public, anon;
grant execute on function public.staffing_candidates(uuid, int, date) to authenticated;
