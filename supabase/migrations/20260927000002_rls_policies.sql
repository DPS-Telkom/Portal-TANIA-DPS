-- TANIA migration 2 — authorization (PRD v3.1 §4, §9, §14; Addendum B-2/B-3)
-- Helpers, RLS on every table, privilege guards, server-side stamping,
-- audit triggers, sign-up trigger, attachments bucket.
--
-- Access model:
--   * guest (default for every sign-up) reads only its own profile row.
--   * inactive users (is_active = false) resolve to no role → no access.
--   * anon has no access to anything.

-- Helpers get_my_role / is_member / has_role / is_manager_of live in
-- migration 1 (the views need them).

-- ---------------------------------------------------------------------------
-- Sign-up trigger: every new auth user gets a guest profile.
-- Only full_name is taken from user metadata — role/manager/is_active are
-- NEVER read from it (a client controls signUp metadata).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1), ''), 200),
    'guest'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: accounts that existed before this schema also start as guest.
insert into public.profiles (id, email, full_name, role)
select u.id, u.email,
       left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1), ''), 200),
       'guest'
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Profile guard (§4.1): non-admins cannot change role, is_active, manager_id
-- or email. Maintenance contexts without a JWT (SQL editor, seed scripts)
-- are allowed so the first admin can be bootstrapped.
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'profile id is immutable' using errcode = '42501';
  end if;

  if public.get_my_role() is distinct from 'admin' and (
       new.role       is distinct from old.role
    or new.is_active  is distinct from old.is_active
    or new.manager_id is distinct from old.manager_id
    or new.email      is distinct from old.email
  ) then
    raise exception 'only admin can change role, is_active, manager_id or email'
      using errcode = '42501';
  end if;

  -- Guests may only edit their display name.
  if public.get_my_role() is distinct from 'admin' and old.role = 'guest' and (
       new.squad    is distinct from old.squad
    or new.grade    is distinct from old.grade
    or new.location is distinct from old.location
  ) then
    raise exception 'guest may only update full_name' using errcode = '42501';
  end if;

  -- An admin cannot demote or deactivate themselves (prevents lock-out).
  if new.id = auth.uid() and (new.role is distinct from old.role or new.is_active is distinct from old.is_active) then
    raise exception 'admin cannot change own role or active status' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- ---------------------------------------------------------------------------
-- Timesheet workflow (TS-02, §7.2, §9)
--   draft/rejected → (owner edits) → draft | submitted
--   submitted      → (reviewer)    → approved | rejected (rejected needs note)
--   approved       → no changes (no reopen in R1)
-- Reviewer = direct manager, chapter_lead or admin; never the owner.
-- Stamps submitted_at / approved_by / approved_at server-side.
-- ---------------------------------------------------------------------------
create or replace function public.timesheet_workflow()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  is_reviewer boolean;
begin
  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'submitted') then
      raise exception 'new timesheet must be draft or submitted' using errcode = '42501';
    end if;
    new.submitted_at := case when new.status = 'submitted' then now() end;
    new.approved_by  := null;
    new.approved_at  := null;
    new.review_note  := null;
    return new;
  end if;

  -- UPDATE
  if new.profile_id is distinct from old.profile_id then
    raise exception 'timesheet owner is immutable' using errcode = '42501';
  end if;

  if old.status = 'approved' then
    raise exception 'approved timesheets cannot be changed' using errcode = '42501';
  end if;

  if old.status = 'submitted' then
    if new.status not in ('approved', 'rejected') then
      raise exception 'submitted timesheet can only be approved or rejected' using errcode = '42501';
    end if;

    is_reviewer := old.profile_id <> auth.uid() and (
      public.is_manager_of(old.profile_id)
      or public.has_role(array['chapter_lead', 'admin']::public.user_role[])
    );
    if not is_reviewer then
      raise exception 'not allowed to review this timesheet' using errcode = '42501';
    end if;

    if new.project_id  is distinct from old.project_id
    or new.activity_id is distinct from old.activity_id
    or new.work_date   is distinct from old.work_date
    or new.hours       is distinct from old.hours
    or new.note        is distinct from old.note then
      raise exception 'reviewer cannot edit timesheet content' using errcode = '42501';
    end if;

    if new.status = 'rejected' and coalesce(trim(new.review_note), '') = '' then
      raise exception 'rejection requires a review note' using errcode = '23514';
    end if;

    new.submitted_at := old.submitted_at;
    new.approved_by  := auth.uid();
    new.approved_at  := now();
    return new;
  end if;

  -- old.status in (draft, rejected): owner editing
  if new.status not in ('draft', 'submitted') then
    raise exception 'owner can only save draft or submit' using errcode = '42501';
  end if;
  new.submitted_at := case when new.status = 'submitted' then now() end;
  new.approved_by  := null;
  new.approved_at  := null;
  -- keep the reviewer's note visible while the row is still rejected-and-editing
  new.review_note  := case when new.status = 'draft' then old.review_note end;
  return new;
end;
$$;

create trigger timesheets_workflow before insert or update on public.timesheets
  for each row execute function public.timesheet_workflow();

-- ---------------------------------------------------------------------------
-- Feasibility decision gate (PF-04, §9)
--   * decision can be set/changed only by chapter_lead/admin
--   * a decision requires a non-empty rationale
--   * decided_by / decided_at stamped server-side
-- ---------------------------------------------------------------------------
create or replace function public.feasibility_decision_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    new.submitted_by := coalesce(auth.uid(), new.submitted_by);
    if new.decision is not null then
      raise exception 'record the case first, then decide' using errcode = '42501';
    end if;
    new.decision_rationale := null;
    new.decided_by := null;
    new.decided_at := null;
    return new;
  end if;

  if new.submitted_by is distinct from old.submitted_by then
    raise exception 'submitter is immutable' using errcode = '42501';
  end if;

  if new.decision is distinct from old.decision
  or new.decision_rationale is distinct from old.decision_rationale then
    if auth.uid() is not null
       and not public.has_role(array['chapter_lead', 'admin']::public.user_role[]) then
      raise exception 'only chapter_lead or admin can decide' using errcode = '42501';
    end if;
    if new.decision is not null and coalesce(trim(new.decision_rationale), '') = '' then
      raise exception 'decision requires a rationale' using errcode = '23514';
    end if;
    new.decided_by := case when new.decision is not null then auth.uid() end;
    new.decided_at := case when new.decision is not null then now() end;
  else
    new.decided_by := old.decided_by;
    new.decided_at := old.decided_at;
  end if;

  return new;
end;
$$;

create trigger feasibility_cases_decision_guard before insert or update on public.feasibility_cases
  for each row execute function public.feasibility_decision_guard();

-- Budget entries: creator is always the caller.
create or replace function public.budget_entry_stamp()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
  elsif new.created_by is distinct from old.created_by then
    raise exception 'created_by is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger budget_entries_stamp before insert or update on public.budget_entries
  for each row execute function public.budget_entry_stamp();

-- ---------------------------------------------------------------------------
-- Audit (XM-05) — actor, time, before/after. Written only by this trigger.
-- ---------------------------------------------------------------------------
create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  rec_id text;
begin
  rec_id := coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id');
  insert into public.audit_log (table_name, record_id, action, actor, old_data, new_data)
  values (
    tg_table_name,
    rec_id,
    tg_op,
    auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger profiles_audit after insert or update or delete on public.profiles
  for each row execute function public.write_audit_log();
create trigger timesheets_audit after insert or update or delete on public.timesheets
  for each row execute function public.write_audit_log();
create trigger allocations_audit after insert or update or delete on public.allocations
  for each row execute function public.write_audit_log();
create trigger feasibility_cases_audit after insert or update or delete on public.feasibility_cases
  for each row execute function public.write_audit_log();
create trigger budget_lines_audit after insert or update or delete on public.budget_lines
  for each row execute function public.write_audit_log();
create trigger budget_entries_audit after insert or update or delete on public.budget_entries
  for each row execute function public.write_audit_log();

-- ---------------------------------------------------------------------------
-- Grants: anon gets nothing; authenticated gets table verbs, RLS decides rows.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;
revoke insert, update, delete on public.audit_log from authenticated;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

-- ---------------------------------------------------------------------------
-- Enable RLS on every table
-- ---------------------------------------------------------------------------
alter table public.profiles                    enable row level security;
alter table public.skills                      enable row level security;
alter table public.profile_skills              enable row level security;
alter table public.projects                    enable row level security;
alter table public.activities                  enable row level security;
alter table public.allocations                 enable row level security;
alter table public.timesheets                  enable row level security;
alter table public.feasibility_cases           enable row level security;
alter table public.feasibility_required_skills enable row level security;
alter table public.budget_lines                enable row level security;
alter table public.budget_entries              enable row level security;
alter table public.audit_log                   enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_member());

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.has_role(array['admin']::public.user_role[]))
  with check (id = auth.uid() or public.has_role(array['admin']::public.user_role[]));
-- No insert (sign-up trigger) and no delete (cascade from auth.users) policies.

-- ---------------------------------------------------------------------------
-- skills (master) / profile_skills (TM-02)
-- ---------------------------------------------------------------------------
create policy skills_select on public.skills
  for select to authenticated using (public.is_member());
create policy skills_write on public.skills
  for all to authenticated
  using (public.has_role(array['manager', 'chapter_lead', 'admin']::public.user_role[]))
  with check (public.has_role(array['manager', 'chapter_lead', 'admin']::public.user_role[]));

create policy profile_skills_select on public.profile_skills
  for select to authenticated using (public.is_member());
create policy profile_skills_write on public.profile_skills
  for all to authenticated
  using (
    public.is_member() and (
      profile_id = auth.uid()
      or public.is_manager_of(profile_id)
      or public.has_role(array['chapter_lead', 'admin']::public.user_role[])
    )
  )
  with check (
    public.is_member() and (
      profile_id = auth.uid()
      or public.is_manager_of(profile_id)
      or public.has_role(array['chapter_lead', 'admin']::public.user_role[])
    )
  );

-- ---------------------------------------------------------------------------
-- projects / activities (TS-03)
-- ---------------------------------------------------------------------------
create policy projects_select on public.projects
  for select to authenticated using (public.is_member());
create policy projects_insert on public.projects
  for insert to authenticated
  with check (public.has_role(array['manager', 'chapter_lead', 'admin']::public.user_role[]));
create policy projects_update on public.projects
  for update to authenticated
  using (
    public.has_role(array['manager', 'chapter_lead', 'admin']::public.user_role[])
    or (public.has_role(array['pm']::public.user_role[]) and pm_id = auth.uid())
  )
  with check (
    public.has_role(array['manager', 'chapter_lead', 'admin']::public.user_role[])
    or (public.has_role(array['pm']::public.user_role[]) and pm_id = auth.uid())
  );
create policy projects_delete on public.projects
  for delete to authenticated
  using (public.has_role(array['chapter_lead', 'admin']::public.user_role[]));

create policy activities_select on public.activities
  for select to authenticated using (public.is_member());
create policy activities_write on public.activities
  for all to authenticated
  using (public.has_role(array['manager', 'chapter_lead', 'admin']::public.user_role[]))
  with check (public.has_role(array['manager', 'chapter_lead', 'admin']::public.user_role[]));

-- ---------------------------------------------------------------------------
-- allocations (WA-01) — read: members; write: manager+/pm on own projects
-- ---------------------------------------------------------------------------
create policy allocations_select on public.allocations
  for select to authenticated using (public.is_member());
create policy allocations_write on public.allocations
  for all to authenticated
  using (
    public.has_role(array['manager', 'chapter_lead', 'admin']::public.user_role[])
    or (
      public.has_role(array['pm']::public.user_role[])
      and exists (select 1 from public.projects p where p.id = project_id and p.pm_id = auth.uid())
    )
  )
  with check (
    public.has_role(array['manager', 'chapter_lead', 'admin']::public.user_role[])
    or (
      public.has_role(array['pm']::public.user_role[])
      and exists (select 1 from public.projects p where p.id = project_id and p.pm_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- timesheets (TS-01, TS-02) — state transitions enforced by trigger above
-- ---------------------------------------------------------------------------
create policy timesheets_select on public.timesheets
  for select to authenticated
  using (
    public.is_member() and (
      profile_id = auth.uid()
      or public.is_manager_of(profile_id)
      or public.has_role(array['chapter_lead', 'executive', 'admin']::public.user_role[])
    )
  );

create policy timesheets_insert_own on public.timesheets
  for insert to authenticated
  with check (
    public.is_member()
    and profile_id = auth.uid()
    and exists (select 1 from public.projects p where p.id = project_id and p.status = 'active')
    and exists (select 1 from public.activities a where a.id = activity_id and a.is_active)
  );

create policy timesheets_update_own on public.timesheets
  for update to authenticated
  using (public.is_member() and profile_id = auth.uid() and status in ('draft', 'rejected'))
  with check (
    public.is_member()
    and profile_id = auth.uid()
    and status in ('draft', 'submitted')
    and exists (select 1 from public.projects p where p.id = project_id and p.status = 'active')
    and exists (select 1 from public.activities a where a.id = activity_id and a.is_active)
  );

create policy timesheets_review on public.timesheets
  for update to authenticated
  using (
    status = 'submitted'
    and profile_id <> auth.uid()
    and (
      public.is_manager_of(profile_id)
      or public.has_role(array['chapter_lead', 'admin']::public.user_role[])
    )
  )
  with check (status in ('approved', 'rejected'));

create policy timesheets_delete_own on public.timesheets
  for delete to authenticated
  using (public.is_member() and profile_id = auth.uid() and status in ('draft', 'rejected'));

-- ---------------------------------------------------------------------------
-- feasibility (PF-01, PF-04) — decision fields guarded by trigger above
-- ---------------------------------------------------------------------------
create policy feasibility_cases_select on public.feasibility_cases
  for select to authenticated using (public.is_member());

create policy feasibility_cases_insert on public.feasibility_cases
  for insert to authenticated
  with check (
    public.has_role(array['pm', 'manager', 'chapter_lead', 'admin']::public.user_role[])
    and submitted_by = auth.uid()
  );

create policy feasibility_cases_update on public.feasibility_cases
  for update to authenticated
  using (
    public.has_role(array['chapter_lead', 'admin']::public.user_role[])
    or (
      public.has_role(array['pm', 'manager']::public.user_role[])
      and submitted_by = auth.uid()
      and decision is null
    )
  )
  with check (
    public.has_role(array['chapter_lead', 'admin']::public.user_role[])
    or (
      public.has_role(array['pm', 'manager']::public.user_role[])
      and submitted_by = auth.uid()
      and decision is null
    )
  );

create policy feasibility_cases_delete on public.feasibility_cases
  for delete to authenticated
  using (
    public.has_role(array['chapter_lead', 'admin']::public.user_role[])
    or (submitted_by = auth.uid() and decision is null and public.is_member())
  );

create policy feasibility_required_skills_select on public.feasibility_required_skills
  for select to authenticated using (public.is_member());
create policy feasibility_required_skills_write on public.feasibility_required_skills
  for all to authenticated
  using (
    exists (
      select 1 from public.feasibility_cases c
      where c.id = case_id
        and (
          public.has_role(array['chapter_lead', 'admin']::public.user_role[])
          or (c.submitted_by = auth.uid() and c.decision is null
              and public.has_role(array['pm', 'manager']::public.user_role[]))
        )
    )
  )
  with check (
    exists (
      select 1 from public.feasibility_cases c
      where c.id = case_id
        and (
          public.has_role(array['chapter_lead', 'admin']::public.user_role[])
          or (c.submitted_by = auth.uid() and c.decision is null
              and public.has_role(array['pm', 'manager']::public.user_role[]))
        )
    )
  );

-- ---------------------------------------------------------------------------
-- budget (BC) — talent and guest: no access at all (CLAUDE.md §2.5)
-- ---------------------------------------------------------------------------
create policy budget_lines_select on public.budget_lines
  for select to authenticated
  using (public.has_role(array['pm', 'manager', 'chapter_lead', 'executive', 'admin']::public.user_role[]));
create policy budget_lines_write on public.budget_lines
  for all to authenticated
  using (public.has_role(array['chapter_lead', 'admin']::public.user_role[]))
  with check (public.has_role(array['chapter_lead', 'admin']::public.user_role[]));

create policy budget_entries_select on public.budget_entries
  for select to authenticated
  using (public.has_role(array['pm', 'manager', 'chapter_lead', 'executive', 'admin']::public.user_role[]));
create policy budget_entries_insert on public.budget_entries
  for insert to authenticated
  with check (
    public.has_role(array['pm', 'manager', 'chapter_lead', 'admin']::public.user_role[])
    and created_by = auth.uid()
  );
create policy budget_entries_update on public.budget_entries
  for update to authenticated
  using (public.has_role(array['chapter_lead', 'admin']::public.user_role[]))
  with check (public.has_role(array['chapter_lead', 'admin']::public.user_role[]));
create policy budget_entries_delete on public.budget_entries
  for delete to authenticated
  using (public.has_role(array['chapter_lead', 'admin']::public.user_role[]));

-- ---------------------------------------------------------------------------
-- audit_log — read by chapter_lead/admin; no write policies
-- ---------------------------------------------------------------------------
create policy audit_log_select on public.audit_log
  for select to authenticated
  using (public.has_role(array['chapter_lead', 'admin']::public.user_role[]));

-- ---------------------------------------------------------------------------
-- Storage: private `attachments` bucket, ≤10 MB (PF-06). Members only.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;

create policy attachments_select on storage.objects
  for select to authenticated
  using (bucket_id = 'attachments' and public.is_member());
create policy attachments_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'attachments' and public.is_member() and owner_id = auth.uid()::text);
create policy attachments_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'attachments'
    and (
      (owner_id = auth.uid()::text and public.is_member())
      or public.has_role(array['chapter_lead', 'admin']::public.user_role[])
    )
  );
