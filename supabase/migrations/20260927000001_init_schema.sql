-- TANIA migration 1 — core schema (PRD v3.1 §8)
-- Enums, core tables, derived views, updated_at triggers.
-- Authorization helpers are defined here (views depend on them); RLS,
-- guards and audit live in migration 2 (applied together).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums (§8.1 + Addendum B-2: `guest` is the default for new sign-ups)
-- ---------------------------------------------------------------------------
create type public.user_role as enum
  ('executive', 'chapter_lead', 'manager', 'pm', 'talent', 'admin', 'guest');
create type public.project_status as enum
  ('candidate', 'active', 'on_hold', 'completed', 'cancelled');
create type public.activity_category as enum
  ('delivery', 'presales', 'internal', 'leave', 'training');
create type public.timesheet_status as enum
  ('draft', 'submitted', 'approved', 'rejected');
create type public.feasibility_decision as enum ('go', 'no_go', 'hold');
create type public.budget_entry_type as enum ('commitment', 'realization');

-- ---------------------------------------------------------------------------
-- updated_at trigger function (§8.4)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — 1:1 with auth.users (TM-01)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  email       text,
  role        public.user_role not null default 'guest',
  squad       text,
  grade       text,
  location    text,
  manager_id  uuid references public.profiles (id) on delete set null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint profiles_not_own_manager check (manager_id is null or manager_id <> id)
);
create index profiles_manager_id_idx on public.profiles (manager_id);
create index profiles_role_idx on public.profiles (role);
create index profiles_squad_idx on public.profiles (squad);

-- ---------------------------------------------------------------------------
-- Competency matrix (TM-02)
-- ---------------------------------------------------------------------------
create table public.skills (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  category    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.profile_skills (
  profile_id          uuid not null references public.profiles (id) on delete cascade,
  skill_id            uuid not null references public.skills (id) on delete cascade,
  level               smallint not null check (level between 1 and 5),
  is_certified        boolean not null default false,
  certification_name  text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  primary key (profile_id, skill_id)
);
create index profile_skills_skill_level_idx on public.profile_skills (skill_id, level);

-- ---------------------------------------------------------------------------
-- Master data (TS-03)
-- ---------------------------------------------------------------------------
create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  name         text not null,
  customer     text,
  description  text,
  status       public.project_status not null default 'active',
  pm_id        uuid references public.profiles (id) on delete set null,
  start_date   date,
  end_date     date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint projects_dates_ordered check (end_date is null or start_date is null or end_date >= start_date)
);
create index projects_pm_id_idx on public.projects (pm_id);
create index projects_status_idx on public.projects (status);

create table public.activities (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  category    public.activity_category not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- allocations — planned % per person/project/month (WA-01)
-- ---------------------------------------------------------------------------
create table public.allocations (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  project_id    uuid not null references public.projects (id) on delete cascade,
  period_month  date not null check (extract(day from period_month) = 1),
  percent       numeric(5,2) not null check (percent >= 0 and percent <= 150),
  created_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (profile_id, project_id, period_month)
);
create index allocations_project_id_idx on public.allocations (project_id);
create index allocations_period_idx on public.allocations (period_month);

-- ---------------------------------------------------------------------------
-- timesheets (TS-01, TS-02, BR-WA-02, §7.2)
-- submitted_at / approved_by / approved_at are stamped by trigger (migration 2).
-- ---------------------------------------------------------------------------
create table public.timesheets (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  project_id    uuid not null references public.projects (id),
  activity_id   uuid not null references public.activities (id),
  work_date     date not null,
  hours         numeric(4,2) not null check (hours > 0 and hours <= 24),
  note          text,
  status        public.timesheet_status not null default 'draft',
  submitted_at  timestamptz,
  approved_by   uuid references public.profiles (id) on delete set null,
  approved_at   timestamptz,
  review_note   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (profile_id, project_id, activity_id, work_date)
);
create index timesheets_profile_date_idx on public.timesheets (profile_id, work_date);
create index timesheets_status_idx on public.timesheets (status);
create index timesheets_project_id_idx on public.timesheets (project_id);
create index timesheets_activity_id_idx on public.timesheets (activity_id);

-- ---------------------------------------------------------------------------
-- feasibility_cases (PF-01..PF-05, §7.3)
-- total_score: 5 dimensions 0–5 weighted 25/25/20/15/15, scaled 0–100.
-- Weights pending AG-01; never write total_score.
-- ---------------------------------------------------------------------------
create table public.feasibility_cases (
  id                    uuid primary key default gen_random_uuid(),
  title                 text not null,
  customer              text,
  description           text,
  est_revenue           numeric(18,2) check (est_revenue is null or est_revenue >= 0),
  est_effort_hours      numeric(10,2) check (est_effort_hours is null or est_effort_hours >= 0),
  est_duration_months   integer check (est_duration_months is null or est_duration_months > 0),
  start_month           date check (start_month is null or extract(day from start_month) = 1),
  score_strategic       smallint not null default 0 check (score_strategic between 0 and 5),
  score_financial       smallint not null default 0 check (score_financial between 0 and 5),
  score_risk            smallint not null default 0 check (score_risk between 0 and 5),
  score_resource        smallint not null default 0 check (score_resource between 0 and 5),
  score_technical       smallint not null default 0 check (score_technical between 0 and 5),
  total_score           numeric(5,2) generated always as (
                          (score_strategic * 25 + score_financial * 25 + score_risk * 20
                           + score_resource * 15 + score_technical * 15)::numeric / 5
                        ) stored,
  decision              public.feasibility_decision,
  decision_rationale    text,
  decided_by            uuid references public.profiles (id) on delete set null,
  decided_at            timestamptz,
  project_id            uuid references public.projects (id) on delete set null,
  submitted_by          uuid not null default auth.uid() references public.profiles (id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index feasibility_cases_decision_idx on public.feasibility_cases (decision);
create index feasibility_cases_submitted_by_idx on public.feasibility_cases (submitted_by);

-- Required competencies per case, input to the resource check (PF-03).
create table public.feasibility_required_skills (
  case_id     uuid not null references public.feasibility_cases (id) on delete cascade,
  skill_id    uuid not null references public.skills (id) on delete cascade,
  min_level   smallint not null default 3 check (min_level between 1 and 5),
  headcount   smallint not null default 1 check (headcount > 0),
  primary key (case_id, skill_id)
);

-- ---------------------------------------------------------------------------
-- Budget (BC-01..BC-05, §7.4) — lines hold plan only.
-- ---------------------------------------------------------------------------
create table public.budget_lines (
  id           uuid primary key default gen_random_uuid(),
  fiscal_year  integer not null check (fiscal_year between 2000 and 2100),
  program      text not null,
  category     text not null,
  plan_amount  numeric(18,2) not null check (plan_amount >= 0),
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (fiscal_year, program, category)
);

create table public.budget_entries (
  id                   uuid primary key default gen_random_uuid(),
  budget_line_id       uuid not null references public.budget_lines (id) on delete restrict,
  entry_type           public.budget_entry_type not null,
  amount               numeric(18,2) not null check (amount > 0),
  entry_date           date not null default current_date,
  description          text,
  feasibility_case_id  uuid references public.feasibility_cases (id) on delete set null,
  created_by           uuid not null default auth.uid() references public.profiles (id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index budget_entries_line_idx on public.budget_entries (budget_line_id, entry_type);
create index budget_entries_case_idx on public.budget_entries (feasibility_case_id);

-- ---------------------------------------------------------------------------
-- audit_log (XM-05) — trigger-populated only (migration 2).
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id          bigint generated always as identity primary key,
  table_name  text not null,
  record_id   text,
  action      text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  actor       uuid,
  changed_at  timestamptz not null default now(),
  old_data    jsonb,
  new_data    jsonb
);
create index audit_log_table_record_idx on public.audit_log (table_name, record_id);
create index audit_log_changed_at_idx on public.audit_log (changed_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger skills_updated_at before update on public.skills
  for each row execute function public.set_updated_at();
create trigger profile_skills_updated_at before update on public.profile_skills
  for each row execute function public.set_updated_at();
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger activities_updated_at before update on public.activities
  for each row execute function public.set_updated_at();
create trigger allocations_updated_at before update on public.allocations
  for each row execute function public.set_updated_at();
create trigger timesheets_updated_at before update on public.timesheets
  for each row execute function public.set_updated_at();
create trigger feasibility_cases_updated_at before update on public.feasibility_cases
  for each row execute function public.set_updated_at();
create trigger budget_lines_updated_at before update on public.budget_lines
  for each row execute function public.set_updated_at();
create trigger budget_entries_updated_at before update on public.budget_entries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers — SECURITY DEFINER so policies on profiles do not recurse.
-- ---------------------------------------------------------------------------
create or replace function public.get_my_role()
returns public.user_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.profiles where id = auth.uid() and is_active;
$$;

-- True for any active, non-guest user: the gate for reading module data.
create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.get_my_role() not in ('guest'), false);
$$;

create or replace function public.has_role(roles public.user_role[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.get_my_role() = any (roles), false);
$$;

-- True when the caller is the direct manager of `target`.
create or replace function public.is_manager_of(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = target and manager_id = auth.uid()
  ) and public.is_member();
$$;

revoke all on function public.get_my_role() from public, anon;
revoke all on function public.is_member() from public, anon;
revoke all on function public.has_role(public.user_role[]) from public, anon;
revoke all on function public.is_manager_of(uuid) from public, anon;
grant execute on function public.get_my_role() to authenticated;
grant execute on function public.is_member() to authenticated;
grant execute on function public.has_role(public.user_role[]) to authenticated;
grant execute on function public.is_manager_of(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Views (§8.3) — security_invoker so results follow the caller's RLS.
-- ---------------------------------------------------------------------------

-- utilization_monthly (WA-02, BR-WA-01..04)
-- capacity = 8h × Mon–Fri in the month (holidays not yet excluded);
-- actual = approved hours only; capacity 0 → utilization_pct null (N/A).
create view public.utilization_monthly
with (security_invoker = true) as
with months as (
  select profile_id, date_trunc('month', work_date)::date as period_month
  from public.timesheets
  union
  select profile_id, period_month from public.allocations
),
actual as (
  select profile_id, date_trunc('month', work_date)::date as period_month,
         sum(hours) as approved_hours
  from public.timesheets
  where status = 'approved'
  group by 1, 2
),
planned as (
  select profile_id, period_month, sum(percent) as planned_pct
  from public.allocations
  group by 1, 2
)
select
  m.profile_id,
  p.full_name,
  p.squad,
  m.period_month,
  coalesce(a.approved_hours, 0)::numeric(8,2) as approved_hours,
  c.capacity_hours,
  case when c.capacity_hours > 0
       then round(coalesce(a.approved_hours, 0) / c.capacity_hours * 100, 1)
  end as utilization_pct,
  coalesce(pl.planned_pct, 0)::numeric(6,2) as planned_pct
from months m
join public.profiles p on p.id = m.profile_id
cross join lateral (
  select (8 * count(*))::numeric(8,2) as capacity_hours
  from generate_series(m.period_month,
                       (m.period_month + interval '1 month' - interval '1 day')::date,
                       interval '1 day') as d
  where extract(isodow from d) < 6
) c
left join actual a on a.profile_id = m.profile_id and a.period_month = m.period_month
left join planned pl on pl.profile_id = m.profile_id and pl.period_month = m.period_month
-- Only rows whose timesheets the caller may read; otherwise approved_hours
-- would silently show 0 for people outside the caller's scope.
where m.profile_id = auth.uid()
   or public.is_manager_of(m.profile_id)
   or public.has_role(array['chapter_lead', 'executive', 'admin']::public.user_role[]);

-- budget_summary (BC-03, BC-04) — remaining = plan − realized.
create view public.budget_summary
with (security_invoker = true) as
select
  l.id as budget_line_id,
  l.fiscal_year,
  l.program,
  l.category,
  l.plan_amount,
  coalesce(sum(e.amount) filter (where e.entry_type = 'commitment'), 0)::numeric(18,2) as committed,
  coalesce(sum(e.amount) filter (where e.entry_type = 'realization'), 0)::numeric(18,2) as realized,
  (l.plan_amount - coalesce(sum(e.amount) filter (where e.entry_type = 'realization'), 0))::numeric(18,2) as remaining,
  case when l.plan_amount > 0
       then round(coalesce(sum(e.amount) filter (where e.entry_type = 'realization'), 0) / l.plan_amount * 100, 1)
  end as realized_pct,
  case when l.plan_amount > 0
       then round(coalesce(sum(e.amount) filter (where e.entry_type = 'commitment'), 0) / l.plan_amount * 100, 1)
  end as committed_pct
from public.budget_lines l
left join public.budget_entries e on e.budget_line_id = l.id
group by l.id;
