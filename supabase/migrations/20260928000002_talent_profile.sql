-- TANIA migration 11 — Talent Profile (PRD Addendum C / prd-talent TP-001..TP-013, TP-016)
--
-- Extends existing structures instead of duplicating them:
--   talents            → public.profiles (+ work attributes)
--   capability / competency / expertise catalog → public.skills (+ kind)
--   talent_capabilities/competencies/expertise, talent_assessments
--                      → public.profile_skills (+ target, score, source, confidence)
--   talent_audit_logs  → public.audit_log (+ triggers on every new table)
--   competency_gaps    → view (computed, never stored)
-- New tables only where no structure exists: career positions, certifications,
-- project experience, evidence, performance reviews, development plans, and a
-- private per-user log of Talent AI requests.
--
-- Access model (decision 2026-09-28):
--   can_view_talent(p)    = self, anyone above p in the reporting line,
--                           chapter_lead, hr, executive, admin
--   can_develop_talent(p) = self, reporting line, chapter_lead, hr, admin
--   HR-owned data (career, performance, verification) = hr, admin

-- ---------------------------------------------------------------------------
-- 1. Authorization helpers
-- ---------------------------------------------------------------------------
-- True when the caller is a (direct or indirect) manager of `target`.
-- Walks up manager_id at most 8 levels (cycle-safe).
create or replace function public.is_in_reporting_line(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with recursive chain(id, manager_id, depth) as (
    select p.id, p.manager_id, 0 from public.profiles p where p.id = target
    union all
    select p.id, p.manager_id, c.depth + 1
    from public.profiles p
    join chain c on p.id = c.manager_id
    where c.depth < 8
  )
  select public.is_member()
     and target is distinct from auth.uid()
     and exists (select 1 from chain where manager_id = auth.uid());
$$;

create or replace function public.can_view_talent(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_member() and (
    target = auth.uid()
    or public.is_in_reporting_line(target)
    or public.has_role(array['chapter_lead', 'hr', 'executive', 'admin']::public.user_role[])
  );
$$;

create or replace function public.can_develop_talent(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_member() and (
    target = auth.uid()
    or public.is_in_reporting_line(target)
    or public.has_role(array['chapter_lead', 'hr', 'admin']::public.user_role[])
  );
$$;

revoke all on function public.is_in_reporting_line(uuid) from public, anon;
revoke all on function public.can_view_talent(uuid) from public, anon;
revoke all on function public.can_develop_talent(uuid) from public, anon;
grant execute on function public.is_in_reporting_line(uuid) to authenticated;
grant execute on function public.can_view_talent(uuid) to authenticated;
grant execute on function public.can_develop_talent(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. profiles — work attributes (TP-001)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column employee_id    text,
  add column position_title text,
  add column organization   text,
  add column career_level   text,
  add column join_date      date,
  add column photo_path     text,
  add column is_demo        boolean not null default false;

create unique index profiles_employee_id_key on public.profiles (employee_id) where employee_id is not null;

create policy profiles_update_hr on public.profiles
  for update to authenticated
  using (public.has_role(array['hr']::public.user_role[]))
  with check (public.has_role(array['hr']::public.user_role[]));

-- Column rights per editor (supersedes migration 7's guard):
--   admin   : everything except own role / active status
--   hr      : work attributes (squad, grade, employee_id, position_title,
--             organization, career_level, join_date, photo_path)
--   owner   : full_name, location, photo_path (guest: full_name only)
--   manager : squad, grade of direct reports
--   nobody but admin: role, is_active, manager_id, email; is_demo: maintenance only
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  my_role public.user_role;
  is_self boolean;
  changed text[] := array[]::text[];
  allowed text[];
  c text;
begin
  if auth.uid() is null then
    return new;  -- maintenance context (SQL editor, seed scripts)
  end if;

  if new.id is distinct from old.id then
    raise exception 'profile id is immutable' using errcode = '42501';
  end if;
  if new.is_demo is distinct from old.is_demo then
    raise exception 'is_demo is set by seed scripts only' using errcode = '42501';
  end if;

  my_role := public.get_my_role();
  is_self := new.id = auth.uid();

  if my_role = 'admin' then
    if is_self and (new.role is distinct from old.role or new.is_active is distinct from old.is_active) then
      raise exception 'admin cannot change own role or active status' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.role is distinct from old.role then changed := changed || 'role'; end if;
  if new.is_active is distinct from old.is_active then changed := changed || 'is_active'; end if;
  if new.manager_id is distinct from old.manager_id then changed := changed || 'manager_id'; end if;
  if new.email is distinct from old.email then changed := changed || 'email'; end if;
  if new.full_name is distinct from old.full_name then changed := changed || 'full_name'; end if;
  if new.location is distinct from old.location then changed := changed || 'location'; end if;
  if new.squad is distinct from old.squad then changed := changed || 'squad'; end if;
  if new.grade is distinct from old.grade then changed := changed || 'grade'; end if;
  if new.employee_id is distinct from old.employee_id then changed := changed || 'employee_id'; end if;
  if new.position_title is distinct from old.position_title then changed := changed || 'position_title'; end if;
  if new.organization is distinct from old.organization then changed := changed || 'organization'; end if;
  if new.career_level is distinct from old.career_level then changed := changed || 'career_level'; end if;
  if new.join_date is distinct from old.join_date then changed := changed || 'join_date'; end if;
  if new.photo_path is distinct from old.photo_path then changed := changed || 'photo_path'; end if;

  if array_length(changed, 1) is null then
    return new;
  end if;

  if 'role' = any (changed) or 'is_active' = any (changed) or 'manager_id' = any (changed) or 'email' = any (changed) then
    raise exception 'only admin can change role, is_active, manager_id or email' using errcode = '42501';
  end if;

  allowed := array[]::text[];
  if my_role = 'hr' then
    allowed := allowed || array['squad', 'grade', 'employee_id', 'position_title', 'organization',
                                'career_level', 'join_date', 'photo_path'];
  end if;
  if is_self then
    allowed := allowed || case when old.role = 'guest' then array['full_name']
                               else array['full_name', 'location', 'photo_path'] end;
  elsif public.is_manager_of(new.id) then
    allowed := allowed || array['squad', 'grade'];
  end if;

  foreach c in array changed loop
    if not c = any (allowed) then
      raise exception 'not allowed to change profile field %', c using errcode = '42501';
    end if;
  end loop;

  return new;
end;
$$;
revoke execute on function public.guard_profile_privileges() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Catalog: skills gain a kind; configurable level scale (TP-003..005)
-- ---------------------------------------------------------------------------
alter table public.skills
  add column kind text not null default 'competency'
    check (kind in ('capability', 'competency', 'expertise'));

drop policy skills_write on public.skills;
create policy skills_write on public.skills
  for all to authenticated
  using (public.has_role(array['manager', 'chapter_lead', 'hr', 'admin']::public.user_role[]))
  with check (public.has_role(array['manager', 'chapter_lead', 'hr', 'admin']::public.user_role[]));

-- The same name may exist as a competency and as a capability/expertise.
alter table public.skills drop constraint skills_name_key;
alter table public.skills add constraint skills_name_kind_key unique (name, kind);

insert into public.skills (name, category, kind) values
  ('Digital Product',          'Product',       'capability'),
  ('AI / GenAI',               'Technology',    'capability'),
  ('Solution Architecture',    'Architecture',  'capability'),
  ('Business',                 'Commercial',    'capability'),
  ('Leadership',               'Leadership',    'capability'),
  ('AI & GenAI',               'Technology',    'expertise'),
  ('Digital Product',          'Product',       'expertise'),
  ('Digital Strategy',         'Strategy',      'expertise'),
  ('Enterprise Architecture',  'Architecture',  'expertise'),
  ('Business Transformation',  'Strategy',      'expertise'),
  ('Cloud',                    'Technology',    'expertise'),
  ('Data & Analytics',         'Data',          'expertise')
on conflict (name, kind) do nothing;

create table public.level_scales (
  level        smallint primary key check (level between 1 and 5),
  label        text not null,
  description  text,
  updated_at   timestamptz not null default now()
);
insert into public.level_scales (level, label, description) values
  (1, 'Foundation',   'Memahami konsep dasar; perlu bimbingan penuh'),
  (2, 'Beginner',     'Dapat mengerjakan tugas sederhana dengan arahan'),
  (3, 'Intermediate', 'Mandiri pada tugas umum'),
  (4, 'Advanced',     'Menangani kasus kompleks dan membimbing orang lain'),
  (5, 'Expert',       'Rujukan organisasi; membentuk praktik dan standar')
on conflict (level) do nothing;

create trigger level_scales_updated_at before update on public.level_scales
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. profile_skills — assessment metadata; targets set by manager/HR
-- ---------------------------------------------------------------------------
alter table public.profile_skills
  add column target_level      smallint check (target_level between 1 and 5),
  add column score             numeric(5,2) check (score between 0 and 100),
  add column target_score      numeric(5,2) check (target_score between 0 and 100),
  add column source            text not null default 'self'
    check (source in ('self', 'manager', 'hr', 'assessment', 'system')),
  add column assessed_by       uuid references public.profiles (id) on delete set null,
  add column assessed_at       timestamptz,
  add column confidence        text check (confidence in ('low', 'medium', 'high')),
  add column years_experience  numeric(4,1) check (years_experience >= 0),
  add column last_used         date;

-- Stamps who assessed and in what capacity; owners cannot set their own targets.
create or replace function public.profile_skill_stamp()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  is_owner boolean;
  is_hr boolean;
begin
  if auth.uid() is null then
    return new;  -- imports / seed (source provided by caller)
  end if;
  is_owner := new.profile_id = auth.uid();
  is_hr := public.has_role(array['hr', 'admin']::public.user_role[]);

  if is_owner and not is_hr and (
       (tg_op = 'INSERT' and (new.target_level is not null or new.target_score is not null))
    or (tg_op = 'UPDATE' and (new.target_level is distinct from old.target_level
                              or new.target_score is distinct from old.target_score))
  ) then
    raise exception 'target level is set by your manager or HR' using errcode = '42501';
  end if;

  if tg_op = 'INSERT'
     or new.level is distinct from old.level
     or new.score is distinct from old.score
     or new.is_certified is distinct from old.is_certified then
    new.assessed_by := auth.uid();
    new.assessed_at := now();
    new.source := case when is_owner then 'self' when is_hr then 'hr' else 'manager' end;
  else
    new.source := old.source;
    new.assessed_by := old.assessed_by;
    new.assessed_at := old.assessed_at;
  end if;
  return new;
end;
$$;
revoke execute on function public.profile_skill_stamp() from public, anon, authenticated;

create trigger profile_skills_stamp before insert or update on public.profile_skills
  for each row execute function public.profile_skill_stamp();
create trigger profile_skills_audit after insert or update or delete on public.profile_skills
  for each row execute function public.write_audit_log();

-- Indirect managers and HR may also assess (adds to migration 2's policy).
create policy profile_skills_write_line_hr on public.profile_skills
  for all to authenticated
  using (public.is_in_reporting_line(profile_id) or public.has_role(array['hr']::public.user_role[]))
  with check (public.is_in_reporting_line(profile_id) or public.has_role(array['hr']::public.user_role[]));

-- ---------------------------------------------------------------------------
-- 5. New tables
-- ---------------------------------------------------------------------------
create table public.talent_positions (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.profiles (id) on delete cascade,
  position_title    text not null,
  organization      text,
  start_date        date not null,
  end_date          date,
  responsibilities  text,
  achievements      text,
  created_by        uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint talent_positions_dates check (end_date is null or end_date >= start_date)
);
create index talent_positions_profile_idx on public.talent_positions (profile_id, start_date);

create table public.talent_projects (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.profiles (id) on delete cascade,
  project_id        uuid references public.projects (id) on delete set null,
  name              text not null,
  role              text,
  organization      text,
  domain            text,
  start_date        date,
  end_date          date,
  responsibilities  text,
  outcomes          text,
  created_by        uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint talent_projects_dates check (end_date is null or start_date is null or end_date >= start_date)
);
create index talent_projects_profile_idx on public.talent_projects (profile_id, start_date);

create table public.talent_certifications (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles (id) on delete cascade,
  skill_id       uuid references public.skills (id) on delete set null,
  name           text not null,
  issuer         text,
  credential_id  text,
  issued_on      date,
  expires_on     date,
  url            text,
  file_path      text,
  verification   text not null default 'pending' check (verification in ('pending', 'verified', 'rejected')),
  verified_by    uuid references public.profiles (id) on delete set null,
  verified_at    timestamptz,
  created_by     uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint talent_certifications_dates check (expires_on is null or issued_on is null or expires_on >= issued_on)
);
create index talent_certifications_profile_idx on public.talent_certifications (profile_id);

create table public.talent_evidence (
  id                 uuid primary key default gen_random_uuid(),
  profile_id         uuid not null references public.profiles (id) on delete cascade,
  skill_id           uuid references public.skills (id) on delete set null,
  evidence_type      text not null check (evidence_type in
                       ('project', 'certification', 'assessment', 'training', 'publication',
                        'position', 'manager_validation', 'other')),
  title              text not null,
  description        text,
  url                text,
  evidence_date      date,
  talent_project_id  uuid references public.talent_projects (id) on delete cascade,
  certification_id   uuid references public.talent_certifications (id) on delete cascade,
  position_id        uuid references public.talent_positions (id) on delete cascade,
  verified           boolean not null default false,
  verified_by        uuid references public.profiles (id) on delete set null,
  verified_at        timestamptz,
  created_by         uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index talent_evidence_profile_idx on public.talent_evidence (profile_id, skill_id);

create table public.performance_reviews (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles (id) on delete cascade,
  period_year    integer not null check (period_year between 2000 and 2100),
  period_label   text,
  overall_score  numeric(5,2) check (overall_score between 0 and 100),
  rating         text,
  summary        text,
  source         text not null default 'manual' check (source in ('official', 'manual')),
  recorded_by    uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (profile_id, period_year)
);

create table public.performance_scores (
  review_id  uuid not null references public.performance_reviews (id) on delete cascade,
  dimension  text not null,
  score      numeric(5,2) not null check (score between 0 and 100),
  primary key (review_id, dimension)
);

create table public.development_plans (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  title        text not null,
  objective    text,
  target_role  text,
  start_date   date,
  due_date     date,
  status       text not null default 'active' check (status in ('draft', 'active', 'completed', 'cancelled')),
  origin       text not null default 'manual' check (origin in ('manual', 'ai_recommendation')),
  created_by   uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint development_plans_dates check (due_date is null or start_date is null or due_date >= start_date)
);
create index development_plans_profile_idx on public.development_plans (profile_id, status);

create table public.development_activities (
  id             uuid primary key default gen_random_uuid(),
  plan_id        uuid not null references public.development_plans (id) on delete cascade,
  title          text not null,
  activity_type  text not null default 'learning' check (activity_type in
                   ('learning', 'certification', 'project', 'mentoring', 'assessment', 'milestone', 'other')),
  skill_id       uuid references public.skills (id) on delete set null,
  month_index    smallint check (month_index between 1 and 36),
  start_date     date,
  due_date       date,
  status         text not null default 'planned' check (status in ('planned', 'in_progress', 'completed', 'skipped')),
  completed_at   timestamptz,
  evidence_url   text,
  notes          text,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index development_activities_plan_idx on public.development_activities (plan_id, sort_order);

-- Private per-user log of Talent AI calls (like chat: no admin/lead read).
create table public.talent_ai_requests (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  profile_id     uuid not null references public.profiles (id) on delete cascade,
  kind           text not null check (kind in ('ask', 'insight', 'journey')),
  request_date   date not null default (now() at time zone 'Asia/Jakarta')::date,
  question       text check (length(question) <= 2000),
  response       jsonb not null,
  model          text,
  input_tokens   integer check (input_tokens >= 0),
  output_tokens  integer check (output_tokens >= 0),
  created_at     timestamptz not null default now()
);
create index talent_ai_requests_user_idx on public.talent_ai_requests (user_id, request_date, kind, profile_id);

-- updated_at
create trigger talent_positions_updated_at before update on public.talent_positions for each row execute function public.set_updated_at();
create trigger talent_projects_updated_at before update on public.talent_projects for each row execute function public.set_updated_at();
create trigger talent_certifications_updated_at before update on public.talent_certifications for each row execute function public.set_updated_at();
create trigger talent_evidence_updated_at before update on public.talent_evidence for each row execute function public.set_updated_at();
create trigger performance_reviews_updated_at before update on public.performance_reviews for each row execute function public.set_updated_at();
create trigger development_plans_updated_at before update on public.development_plans for each row execute function public.set_updated_at();
create trigger development_activities_updated_at before update on public.development_activities for each row execute function public.set_updated_at();

-- audit (TP-016)
create trigger talent_positions_audit after insert or update or delete on public.talent_positions for each row execute function public.write_audit_log();
create trigger talent_projects_audit after insert or update or delete on public.talent_projects for each row execute function public.write_audit_log();
create trigger talent_certifications_audit after insert or update or delete on public.talent_certifications for each row execute function public.write_audit_log();
create trigger talent_evidence_audit after insert or update or delete on public.talent_evidence for each row execute function public.write_audit_log();
create trigger performance_reviews_audit after insert or update or delete on public.performance_reviews for each row execute function public.write_audit_log();
create trigger performance_scores_audit after insert or update or delete on public.performance_scores for each row execute function public.write_audit_log();
create trigger development_plans_audit after insert or update or delete on public.development_plans for each row execute function public.write_audit_log();
create trigger development_activities_audit after insert or update or delete on public.development_activities for each row execute function public.write_audit_log();

-- ---------------------------------------------------------------------------
-- 6. Server-side stamping / guards
-- ---------------------------------------------------------------------------
-- Certifications: owners' entries stay pending; only HR/admin verify.
create or replace function public.certification_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  is_hr boolean;
begin
  if auth.uid() is null then return new; end if;
  is_hr := public.has_role(array['hr', 'admin']::public.user_role[]);

  if tg_op = 'UPDATE' and new.profile_id is distinct from old.profile_id then
    raise exception 'certification owner is immutable' using errcode = '42501';
  end if;

  if not is_hr then
    if tg_op = 'INSERT' then
      new.verification := 'pending';
    elsif new.verification is distinct from old.verification then
      raise exception 'only HR can verify certifications' using errcode = '42501';
    elsif new.name is distinct from old.name or new.issuer is distinct from old.issuer
       or new.credential_id is distinct from old.credential_id or new.issued_on is distinct from old.issued_on
       or new.expires_on is distinct from old.expires_on or new.file_path is distinct from old.file_path
       or new.url is distinct from old.url then
      new.verification := 'pending';  -- edited facts need re-verification
    end if;
  end if;

  if tg_op = 'INSERT' or new.verification is distinct from old.verification then
    new.verified_by := case when new.verification = 'pending' then null else auth.uid() end;
    new.verified_at := case when new.verification = 'pending' then null else now() end;
  else
    new.verified_by := old.verified_by;
    new.verified_at := old.verified_at;
  end if;
  return new;
end;
$$;
revoke execute on function public.certification_guard() from public, anon, authenticated;
create trigger talent_certifications_guard before insert or update on public.talent_certifications
  for each row execute function public.certification_guard();

-- Evidence: the talent cannot verify their own evidence.
create or replace function public.evidence_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'UPDATE' and new.profile_id is distinct from old.profile_id then
    raise exception 'evidence owner is immutable' using errcode = '42501';
  end if;
  if (tg_op = 'INSERT' and new.verified) or (tg_op = 'UPDATE' and new.verified is distinct from old.verified) then
    if new.profile_id = auth.uid()
       or not (public.is_in_reporting_line(new.profile_id)
               or public.has_role(array['chapter_lead', 'hr', 'admin']::public.user_role[])) then
      raise exception 'evidence is verified by a manager or HR' using errcode = '42501';
    end if;
  end if;
  if tg_op = 'INSERT' or new.verified is distinct from old.verified then
    new.verified_by := case when new.verified then auth.uid() end;
    new.verified_at := case when new.verified then now() end;
  else
    new.verified_by := old.verified_by;
    new.verified_at := old.verified_at;
  end if;
  return new;
end;
$$;
revoke execute on function public.evidence_guard() from public, anon, authenticated;
create trigger talent_evidence_guard before insert or update on public.talent_evidence
  for each row execute function public.evidence_guard();

-- Performance: recorded_by stamped; the official/manual source is set by HR.
create or replace function public.performance_stamp()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null then
    new.recorded_by := auth.uid();
  end if;
  return new;
end;
$$;
revoke execute on function public.performance_stamp() from public, anon, authenticated;
create trigger performance_reviews_stamp before insert or update on public.performance_reviews
  for each row execute function public.performance_stamp();

-- Activities: completed_at follows status.
create or replace function public.development_activity_stamp()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    new.completed_at := now();
  elsif new.status <> 'completed' then
    new.completed_at := null;
  elsif tg_op = 'UPDATE' then
    new.completed_at := old.completed_at;
  end if;
  return new;
end;
$$;
revoke execute on function public.development_activity_stamp() from public, anon, authenticated;
create trigger development_activities_stamp before insert or update on public.development_activities
  for each row execute function public.development_activity_stamp();

-- Talent AI log: owner is always the caller.
create trigger talent_ai_requests_owner before insert on public.talent_ai_requests
  for each row execute function public.chat_owner_stamp();

-- ---------------------------------------------------------------------------
-- 7. RLS
-- ---------------------------------------------------------------------------
revoke all on public.level_scales, public.talent_positions, public.talent_projects,
  public.talent_certifications, public.talent_evidence, public.performance_reviews,
  public.performance_scores, public.development_plans, public.development_activities,
  public.talent_ai_requests from anon;
revoke truncate, references, trigger on public.level_scales, public.talent_positions, public.talent_projects,
  public.talent_certifications, public.talent_evidence, public.performance_reviews,
  public.performance_scores, public.development_plans, public.development_activities,
  public.talent_ai_requests from authenticated;
revoke update, delete on public.talent_ai_requests from authenticated;

alter table public.level_scales            enable row level security;
alter table public.talent_positions        enable row level security;
alter table public.talent_projects         enable row level security;
alter table public.talent_certifications   enable row level security;
alter table public.talent_evidence         enable row level security;
alter table public.performance_reviews     enable row level security;
alter table public.performance_scores      enable row level security;
alter table public.development_plans       enable row level security;
alter table public.development_activities  enable row level security;
alter table public.talent_ai_requests      enable row level security;

create policy level_scales_select on public.level_scales for select to authenticated using (public.is_member());
create policy level_scales_write on public.level_scales for update to authenticated
  using (public.has_role(array['hr', 'admin']::public.user_role[]))
  with check (public.has_role(array['hr', 'admin']::public.user_role[]));

-- Career history: HR-owned facts.
create policy talent_positions_select on public.talent_positions for select to authenticated
  using (public.can_view_talent(profile_id));
create policy talent_positions_write on public.talent_positions for all to authenticated
  using (public.has_role(array['hr', 'admin']::public.user_role[]))
  with check (public.has_role(array['hr', 'admin']::public.user_role[]));

-- Project experience: owner maintains; HR/admin may correct.
create policy talent_projects_select on public.talent_projects for select to authenticated
  using (public.can_view_talent(profile_id));
create policy talent_projects_write on public.talent_projects for all to authenticated
  using (public.is_member() and (profile_id = auth.uid() or public.has_role(array['hr', 'admin']::public.user_role[])))
  with check (public.is_member() and (profile_id = auth.uid() or public.has_role(array['hr', 'admin']::public.user_role[])));

-- Certifications: owner + HR (verification guarded by trigger).
create policy talent_certifications_select on public.talent_certifications for select to authenticated
  using (public.can_view_talent(profile_id));
create policy talent_certifications_write on public.talent_certifications for all to authenticated
  using (public.is_member() and (profile_id = auth.uid() or public.has_role(array['hr', 'admin']::public.user_role[])))
  with check (public.is_member() and (profile_id = auth.uid() or public.has_role(array['hr', 'admin']::public.user_role[])));

-- Evidence: owner, reporting line, chapter_lead, HR, admin.
create policy talent_evidence_select on public.talent_evidence for select to authenticated
  using (public.can_view_talent(profile_id));
create policy talent_evidence_write on public.talent_evidence for all to authenticated
  using (public.can_develop_talent(profile_id))
  with check (public.can_develop_talent(profile_id));

-- Performance: read within scope; written by HR/admin only (never by AI).
create policy performance_reviews_select on public.performance_reviews for select to authenticated
  using (public.can_view_talent(profile_id));
create policy performance_reviews_write on public.performance_reviews for all to authenticated
  using (public.has_role(array['hr', 'admin']::public.user_role[]))
  with check (public.has_role(array['hr', 'admin']::public.user_role[]));
create policy performance_scores_select on public.performance_scores for select to authenticated
  using (exists (select 1 from public.performance_reviews r where r.id = review_id and public.can_view_talent(r.profile_id)));
create policy performance_scores_write on public.performance_scores for all to authenticated
  using (public.has_role(array['hr', 'admin']::public.user_role[]))
  with check (public.has_role(array['hr', 'admin']::public.user_role[]));

-- Development plans: owner, reporting line, chapter_lead, HR, admin; executive reads.
create policy development_plans_select on public.development_plans for select to authenticated
  using (public.can_view_talent(profile_id));
create policy development_plans_write on public.development_plans for all to authenticated
  using (public.can_develop_talent(profile_id))
  with check (public.can_develop_talent(profile_id));
create policy development_activities_select on public.development_activities for select to authenticated
  using (exists (select 1 from public.development_plans p where p.id = plan_id and public.can_view_talent(p.profile_id)));
create policy development_activities_write on public.development_activities for all to authenticated
  using (exists (select 1 from public.development_plans p where p.id = plan_id and public.can_develop_talent(p.profile_id)))
  with check (exists (select 1 from public.development_plans p where p.id = plan_id and public.can_develop_talent(p.profile_id)));

-- Talent AI log: strictly private per user.
create policy talent_ai_requests_select_own on public.talent_ai_requests for select to authenticated
  using (user_id = auth.uid() and public.is_member());
create policy talent_ai_requests_insert_own on public.talent_ai_requests for insert to authenticated
  with check (user_id = auth.uid() and public.can_view_talent(profile_id));

-- ---------------------------------------------------------------------------
-- 8. Derived data: certification status, competency gaps (computed, never stored)
-- ---------------------------------------------------------------------------
insert into public.app_settings (key, value, label) values
  ('certification_expiring_days', 90, 'Sertifikasi: dianggap akan kedaluwarsa dalam (hari)')
on conflict (key) do nothing;

create or replace function public.certification_status(p_expires_on date, p_verification text)
returns text
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select case
    when p_verification = 'rejected' then 'REJECTED'
    when p_verification <> 'verified' then 'PENDING_VERIFICATION'
    when p_expires_on is null then 'ACTIVE'
    when p_expires_on < current_date then 'EXPIRED'
    when p_expires_on <= current_date + coalesce(
           (select value::int from public.app_settings where key = 'certification_expiring_days'), 90)
      then 'EXPIRING'
    else 'ACTIVE'
  end;
$$;
grant execute on function public.certification_status(date, text) to authenticated;

create view public.talent_certification_status
with (security_invoker = true) as
select c.*, public.certification_status(c.expires_on, c.verification) as status
from public.talent_certifications c;

-- current/target on a 0–100 scale: explicit score, else level × 20.
create view public.competency_gaps
with (security_invoker = true) as
select
  ps.profile_id,
  ps.skill_id,
  s.name as skill_name,
  s.kind,
  s.category,
  ps.level as current_level,
  ps.target_level,
  coalesce(ps.score, ps.level * 20)::numeric(5,2) as current_value,
  coalesce(ps.target_score, ps.target_level * 20)::numeric(5,2) as target_value,
  (coalesce(ps.score, ps.level * 20) - coalesce(ps.target_score, ps.target_level * 20))::numeric(6,2) as gap,
  ps.source,
  ps.assessed_at,
  (select count(*) from public.talent_evidence e
    where e.profile_id = ps.profile_id and e.skill_id = ps.skill_id)::int as evidence_count
from public.profile_skills ps
join public.skills s on s.id = ps.skill_id
where (ps.target_level is not null or ps.target_score is not null)
  and public.can_view_talent(ps.profile_id);

-- ---------------------------------------------------------------------------
-- 9. talent_context(profile_id) — the normalized Talent Context for UI & AI.
--    Security invoker: every section is filtered by the caller's RLS, so the
--    AI never receives data the caller could not read directly.
-- ---------------------------------------------------------------------------
create or replace function public.talent_context(p_profile_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select case when not public.can_view_talent(p_profile_id) then null else jsonb_build_object(
    'generated_at', now(),
    'talent', (
      select jsonb_build_object(
        'id', p.id, 'full_name', p.full_name, 'employee_id', p.employee_id, 'email', p.email,
        'role', p.role, 'position_title', p.position_title, 'organization', p.organization,
        'career_level', p.career_level, 'squad', p.squad, 'grade', p.grade, 'location', p.location,
        'join_date', p.join_date, 'is_active', p.is_active, 'is_demo', p.is_demo, 'photo_path', p.photo_path,
        'manager', (select jsonb_build_object('id', m.id, 'full_name', m.full_name)
                    from public.profiles m where m.id = p.manager_id))
      from public.profiles p where p.id = p_profile_id),
    'level_scale', coalesce((select jsonb_agg(jsonb_build_object('level', level, 'label', label) order by level)
                             from public.level_scales), '[]'::jsonb),
    'career_history', coalesce((
      select jsonb_agg(to_jsonb(t) - 'created_by' order by t.start_date)
      from public.talent_positions t where t.profile_id = p_profile_id), '[]'::jsonb),
    'skills', coalesce((
      select jsonb_agg(jsonb_build_object(
        'skill_id', s.id, 'name', s.name, 'kind', s.kind, 'category', s.category,
        'level', ps.level, 'target_level', ps.target_level, 'score', ps.score, 'target_score', ps.target_score,
        'is_certified', ps.is_certified, 'certification_name', ps.certification_name,
        'source', ps.source, 'assessed_at', ps.assessed_at, 'confidence', ps.confidence,
        'years_experience', ps.years_experience, 'last_used', ps.last_used) order by s.kind, ps.level desc)
      from public.profile_skills ps join public.skills s on s.id = ps.skill_id
      where ps.profile_id = p_profile_id), '[]'::jsonb),
    'certifications', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'name', c.name, 'issuer', c.issuer, 'credential_id', c.credential_id,
        'issued_on', c.issued_on, 'expires_on', c.expires_on, 'status', c.status,
        'verification', c.verification, 'skill_id', c.skill_id, 'url', c.url, 'file_path', c.file_path)
        order by c.issued_on desc nulls last)
      from public.talent_certification_status c where c.profile_id = p_profile_id), '[]'::jsonb),
    'projects', coalesce((
      select jsonb_agg(to_jsonb(t) - 'created_by' order by t.start_date desc nulls last)
      from public.talent_projects t where t.profile_id = p_profile_id), '[]'::jsonb),
    'tania_assignments', coalesce((
      select jsonb_agg(jsonb_build_object('project', pr.code || ' · ' || pr.name, 'first_month', a.first_month,
                                          'last_month', a.last_month, 'avg_percent', a.avg_percent)
                       order by a.last_month desc)
      from (select project_id, min(period_month) first_month, max(period_month) last_month,
                   round(avg(percent), 0) avg_percent
            from public.allocations where profile_id = p_profile_id group by project_id) a
      join public.projects pr on pr.id = a.project_id), '[]'::jsonb),
    'performance_history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'period_year', r.period_year, 'period_label', r.period_label, 'overall_score', r.overall_score,
        'rating', r.rating, 'summary', r.summary, 'source', r.source,
        'scores', coalesce((select jsonb_agg(jsonb_build_object('dimension', sc.dimension, 'score', sc.score)
                                             order by sc.dimension)
                            from public.performance_scores sc where sc.review_id = r.id), '[]'::jsonb))
        order by r.period_year)
      from public.performance_reviews r where r.profile_id = p_profile_id), '[]'::jsonb),
    'gaps', coalesce((
      select jsonb_agg(jsonb_build_object(
        'skill_id', g.skill_id, 'name', g.skill_name, 'kind', g.kind, 'current', g.current_value,
        'target', g.target_value, 'gap', g.gap, 'evidence_count', g.evidence_count, 'source', g.source)
        order by g.gap)
      from public.competency_gaps g where g.profile_id = p_profile_id), '[]'::jsonb),
    'evidence', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'type', e.evidence_type, 'title', e.title, 'description', e.description,
        'skill', s.name, 'skill_id', e.skill_id, 'date', e.evidence_date, 'verified', e.verified, 'url', e.url,
        'talent_project_id', e.talent_project_id, 'certification_id', e.certification_id,
        'position_id', e.position_id) order by e.evidence_date desc nulls last)
      from public.talent_evidence e left join public.skills s on s.id = e.skill_id
      where e.profile_id = p_profile_id), '[]'::jsonb),
    'development_plans', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id, 'title', d.title, 'objective', d.objective, 'target_role', d.target_role,
        'status', d.status, 'origin', d.origin, 'start_date', d.start_date, 'due_date', d.due_date,
        'activities', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', a.id, 'title', a.title, 'type', a.activity_type, 'month_index', a.month_index,
            'status', a.status, 'due_date', a.due_date, 'completed_at', a.completed_at,
            'skill_id', a.skill_id, 'evidence_url', a.evidence_url) order by a.sort_order, a.month_index)
          from public.development_activities a where a.plan_id = d.id), '[]'::jsonb))
        order by d.created_at desc)
      from public.development_plans d where d.profile_id = p_profile_id), '[]'::jsonb)
  ) end;
$$;

revoke all on function public.talent_context(uuid) from public, anon;
grant execute on function public.talent_context(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 10. Storage: private `talent-files` bucket
--     photos/<profile_id>/…        certificates/<profile_id>/…
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('talent-files', 'talent-files', false, 5242880,
        array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

create or replace function public.talent_file_owner(object_name text)
returns uuid
language sql
immutable
set search_path = public, pg_temp
as $$
  select case when split_part(object_name, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then split_part(object_name, '/', 2)::uuid end;
$$;
grant execute on function public.talent_file_owner(text) to authenticated;

create policy talent_files_select on storage.objects for select to authenticated
  using (bucket_id = 'talent-files' and public.can_view_talent(public.talent_file_owner(name)));
create policy talent_files_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'talent-files'
    and split_part(name, '/', 1) in ('photos', 'certificates')
    and (public.talent_file_owner(name) = auth.uid() and public.is_member()
         or public.has_role(array['hr', 'admin']::public.user_role[]))
  );
create policy talent_files_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'talent-files'
    and (public.talent_file_owner(name) = auth.uid() and public.is_member()
         or public.has_role(array['hr', 'admin']::public.user_role[]))
  );
