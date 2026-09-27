-- TANIA RLS security test (PRD v3.1 §18.1) — role × table matrix.
-- Runs entirely inside one transaction and ROLLS BACK: leaves no data.
-- Any failed assertion raises 'FAIL: …' and aborts the run.
-- Run: paste into Supabase SQL editor, or execute via the Supabase MCP / psql.

begin;

-- ---------------------------------------------------------------------------
-- Fixtures (as postgres; auth.uid() is null so guards allow bootstrap)
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
select id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email,
       meta::jsonb, '{}'::jsonb, now(), now()
from (values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.local',  '{"full_name":"Admin"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'lead@test.local',   '{"full_name":"Lead"}'),
  ('00000000-0000-0000-0000-0000000000e1', 'exec@test.local',   '{"full_name":"Exec"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'mgr@test.local',    '{"full_name":"Manager"}'),
  ('00000000-0000-0000-0000-0000000000d1', 'pm@test.local',     '{"full_name":"PM"}'),
  ('00000000-0000-0000-0000-0000000000f1', 'talent1@test.local','{"full_name":"Talent 1"}'),
  ('00000000-0000-0000-0000-0000000000f2', 'talent2@test.local','{"full_name":"Talent 2"}'),
  ('00000000-0000-0000-0000-000000000091', 'guest@test.local',  '{"full_name":"Guest"}'),
  ('00000000-0000-0000-0000-000000000092', 'hacker@test.local', '{"full_name":"Hacker","role":"admin","is_active":true}')
) as u(id, email, meta);

do $$ begin
  if (select count(*) from public.profiles where email like '%@test.local' and role = 'guest') <> 9 then
    raise exception 'FAIL: sign-up trigger must create 9 guest profiles';
  end if;
  if (select role from public.profiles where email = 'hacker@test.local') <> 'guest' then
    raise exception 'FAIL: role from sign-up metadata was honoured';
  end if;
end $$;

update public.profiles set role = 'admin'        where id = '00000000-0000-0000-0000-0000000000a1';
update public.profiles set role = 'chapter_lead' where id = '00000000-0000-0000-0000-0000000000c1';
update public.profiles set role = 'executive'    where id = '00000000-0000-0000-0000-0000000000e1';
update public.profiles set role = 'manager'      where id = '00000000-0000-0000-0000-0000000000b1';
update public.profiles set role = 'pm'           where id = '00000000-0000-0000-0000-0000000000d1';
update public.profiles set role = 'talent', manager_id = '00000000-0000-0000-0000-0000000000b1'
  where id = '00000000-0000-0000-0000-0000000000f1';
update public.profiles set role = 'talent', manager_id = '00000000-0000-0000-0000-0000000000c1'
  where id = '00000000-0000-0000-0000-0000000000f2';

insert into public.projects (id, code, name, status, pm_id) values
  ('00000000-0000-0000-0000-00000000aa01', 'TST-01', 'Test Project', 'active', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-00000000aa02', 'TST-02', 'Closed Project', 'completed', null);

insert into public.allocations (profile_id, project_id, period_month, percent)
values ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-00000000aa01', date_trunc('month', current_date)::date, 80);

insert into public.timesheets (id, profile_id, project_id, activity_id, work_date, hours, status) values
  ('00000000-0000-0000-0000-00000000bb01', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000aa01',
   (select id from public.activities where code = 'DEL'), current_date - 3, 8, 'submitted'),
  ('00000000-0000-0000-0000-00000000bb02', '00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-00000000aa01',
   (select id from public.activities where code = 'DEL'), current_date - 3, 8, 'submitted');

insert into public.budget_lines (id, fiscal_year, program, category, plan_amount)
values ('00000000-0000-0000-0000-00000000cc01', 2026, 'Test Program', 'Opex', 1000000);

insert into public.feasibility_cases (id, title, submitted_by, score_strategic, score_financial, score_risk, score_resource, score_technical)
values ('00000000-0000-0000-0000-00000000dd01', 'Test Case', '00000000-0000-0000-0000-0000000000d1', 5, 5, 5, 5, 5);

do $$ begin
  if (select total_score from public.feasibility_cases where id = '00000000-0000-0000-0000-00000000dd01') <> 100 then
    raise exception 'FAIL: total_score for all-5 must be 100';
  end if;
end $$;

-- ===========================================================================
-- anon: zero access
-- ===========================================================================
set local role anon;
do $$ begin
  begin
    perform 1 from public.profiles limit 1;
    raise exception 'FAIL: anon can read profiles';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- ===========================================================================
-- guest: only own profile row
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000091","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'FAIL: guest sees other profiles'; end if;
  if exists (select 1 from public.skills)              then raise exception 'FAIL: guest reads skills'; end if;
  if exists (select 1 from public.profile_skills)      then raise exception 'FAIL: guest reads profile_skills'; end if;
  if exists (select 1 from public.projects)            then raise exception 'FAIL: guest reads projects'; end if;
  if exists (select 1 from public.activities)          then raise exception 'FAIL: guest reads activities'; end if;
  if exists (select 1 from public.allocations)         then raise exception 'FAIL: guest reads allocations'; end if;
  if exists (select 1 from public.timesheets)          then raise exception 'FAIL: guest reads timesheets'; end if;
  if exists (select 1 from public.feasibility_cases)   then raise exception 'FAIL: guest reads feasibility'; end if;
  if exists (select 1 from public.budget_lines)        then raise exception 'FAIL: guest reads budget_lines'; end if;
  if exists (select 1 from public.budget_entries)      then raise exception 'FAIL: guest reads budget_entries'; end if;
  if exists (select 1 from public.budget_summary)      then raise exception 'FAIL: guest reads budget_summary'; end if;
  if exists (select 1 from public.utilization_monthly) then raise exception 'FAIL: guest reads utilization'; end if;
  if exists (select 1 from public.audit_log)           then raise exception 'FAIL: guest reads audit_log'; end if;
  if exists (select 1 from storage.objects where bucket_id = 'attachments') then raise exception 'FAIL: guest reads attachments'; end if;

  -- may rename self
  update public.profiles set full_name = 'Guest Renamed' where id = auth.uid();
  if (select full_name from public.profiles where id = auth.uid()) <> 'Guest Renamed' then
    raise exception 'FAIL: guest cannot update own full_name';
  end if;

  begin
    update public.profiles set role = 'admin' where id = auth.uid();
    raise exception 'FAIL: guest escalated own role';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.profiles set squad = 'X' where id = auth.uid();
    raise exception 'FAIL: guest edited squad';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.chat_conversations (title) values ('x');
    raise exception 'FAIL: guest created a chat conversation';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.timesheets (project_id, activity_id, work_date, hours)
    values ('00000000-0000-0000-0000-00000000aa01', (select id from public.activities limit 1), current_date, 1);
    raise exception 'FAIL: guest inserted a timesheet';
  exception when insufficient_privilege or not_null_violation then null;
  end;
end $$;
reset role;

-- ===========================================================================
-- talent (t1, manager = b1)
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);
do $$ begin
  if exists (select 1 from public.budget_lines)   then raise exception 'FAIL: talent reads budget_lines'; end if;
  if exists (select 1 from public.budget_entries) then raise exception 'FAIL: talent reads budget_entries'; end if;
  if exists (select 1 from public.budget_summary) then raise exception 'FAIL: talent reads budget_summary'; end if;
  if exists (select 1 from public.audit_log)      then raise exception 'FAIL: talent reads audit_log'; end if;
  if exists (select 1 from public.timesheets where profile_id <> auth.uid()) then
    raise exception 'FAIL: talent reads others'' timesheets';
  end if;
  if exists (select 1 from public.utilization_monthly where profile_id <> auth.uid()) then
    raise exception 'FAIL: talent sees others'' utilization';
  end if;
  if not exists (select 1 from public.projects) then raise exception 'FAIL: talent cannot read projects'; end if;
  if not exists (select 1 from public.allocations) then raise exception 'FAIL: talent cannot read allocations'; end if;

  -- own draft entry
  insert into public.timesheets (project_id, activity_id, work_date, hours)
  values ('00000000-0000-0000-0000-00000000aa01', (select id from public.activities where code = 'INT'), current_date, 4);

  -- forged approval stamp is overwritten
  insert into public.timesheets (project_id, activity_id, work_date, hours, status, approved_by, submitted_at)
  values ('00000000-0000-0000-0000-00000000aa01', (select id from public.activities where code = 'TRN'), current_date, 2,
          'submitted', auth.uid(), '2000-01-01');
  if exists (select 1 from public.timesheets where profile_id = auth.uid() and work_date = current_date
             and (approved_by is not null or submitted_at < now() - interval '1 minute')) then
    raise exception 'FAIL: client-set stamps were kept';
  end if;

  begin
    insert into public.timesheets (profile_id, project_id, activity_id, work_date, hours)
    values ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-00000000aa01',
            (select id from public.activities where code = 'DEL'), current_date, 4);
    raise exception 'FAIL: talent wrote a timesheet for someone else';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.timesheets (project_id, activity_id, work_date, hours)
    values ('00000000-0000-0000-0000-00000000aa02', (select id from public.activities where code = 'DEL'), current_date, 4);
    raise exception 'FAIL: talent logged time on an inactive project';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.timesheets (project_id, activity_id, work_date, hours, status)
    values ('00000000-0000-0000-0000-00000000aa01', (select id from public.activities where code = 'PRE'), current_date, 1, 'approved');
    raise exception 'FAIL: talent inserted an approved timesheet';
  exception when insufficient_privilege then null;
  end;

  -- cannot approve own submitted row (RLS hides it from the review policy; trigger backs it up)
  update public.timesheets set status = 'approved' where id = '00000000-0000-0000-0000-00000000bb01';
  if (select status from public.timesheets where id = '00000000-0000-0000-0000-00000000bb01') <> 'submitted' then
    raise exception 'FAIL: talent approved own timesheet';
  end if;

  begin
    update public.profiles set role = 'admin' where id = auth.uid();
    raise exception 'FAIL: talent escalated own role';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.feasibility_cases (title) values ('x');
    raise exception 'FAIL: talent submitted a feasibility case';
  exception when insufficient_privilege then null;
  end;

  -- private copilot conversation
  insert into public.chat_conversations (id, title) values ('00000000-0000-0000-0000-00000000ee01', 'Talent chat');
end $$;
reset role;

-- ===========================================================================
-- manager (b1): reviews direct reports only
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
do $$ begin
  if not exists (select 1 from public.timesheets where id = '00000000-0000-0000-0000-00000000bb01') then
    raise exception 'FAIL: manager cannot see direct report timesheet';
  end if;
  if exists (select 1 from public.timesheets where id = '00000000-0000-0000-0000-00000000bb02') then
    raise exception 'FAIL: manager sees non-report timesheet';
  end if;

  begin
    update public.timesheets set status = 'rejected' where id = '00000000-0000-0000-0000-00000000bb01';
    raise exception 'FAIL: rejection without note accepted';
  exception when check_violation then null;
  end;

  begin
    update public.timesheets set status = 'approved', hours = 1 where id = '00000000-0000-0000-0000-00000000bb01';
    raise exception 'FAIL: reviewer edited hours';
  exception when insufficient_privilege then null;
  end;

  update public.timesheets set status = 'approved' where id = '00000000-0000-0000-0000-00000000bb01';
  if (select approved_by from public.timesheets where id = '00000000-0000-0000-0000-00000000bb01')
     is distinct from auth.uid() then
    raise exception 'FAIL: approved_by not stamped';
  end if;

  update public.timesheets set status = 'approved' where id = '00000000-0000-0000-0000-00000000bb02';
  if (select count(*) from public.timesheets where id = '00000000-0000-0000-0000-00000000bb02') <> 0 then
    raise exception 'FAIL: manager touched non-report timesheet';
  end if;

  if not exists (select 1 from public.budget_summary) then raise exception 'FAIL: manager cannot read budget'; end if;
end $$;
reset role;

-- talent cannot change an approved row
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);
do $$ begin
  update public.timesheets set hours = 2 where id = '00000000-0000-0000-0000-00000000bb01';
  if (select hours from public.timesheets where id = '00000000-0000-0000-0000-00000000bb01') <> 8 then
    raise exception 'FAIL: approved timesheet was edited';
  end if;
  if (select approved_hours from public.utilization_monthly
      where profile_id = auth.uid() and period_month = date_trunc('month', current_date - 3)::date) <> 8 then
    raise exception 'FAIL: utilization_monthly does not count approved hours';
  end if;
end $$;
reset role;

-- ===========================================================================
-- pm (d1): submits cases, cannot decide; budget read + entries
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
do $$ begin
  insert into public.feasibility_cases (id, title, score_strategic) values ('00000000-0000-0000-0000-00000000dd02', 'PM Case', 3);

  begin
    update public.feasibility_cases set decision = 'go', decision_rationale = 'self-approve'
    where id = '00000000-0000-0000-0000-00000000dd02';
    raise exception 'FAIL: pm decided a case';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.feasibility_cases set total_score = 100 where id = '00000000-0000-0000-0000-00000000dd02';
    raise exception 'FAIL: total_score was writable';
  exception when generated_always or feature_not_supported or insufficient_privilege or syntax_error then null;
  end;

  if not exists (select 1 from public.budget_summary) then raise exception 'FAIL: pm cannot read budget'; end if;

  insert into public.budget_entries (budget_line_id, entry_type, amount, created_by, feasibility_case_id)
  values ('00000000-0000-0000-0000-00000000cc01', 'commitment', 900000,
          '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000dd01');
  if exists (select 1 from public.budget_entries where created_by <> auth.uid()) then
    raise exception 'FAIL: created_by was forgeable';
  end if;

  begin
    insert into public.budget_lines (fiscal_year, program, category, plan_amount) values (2026, 'X', 'Y', 1);
    raise exception 'FAIL: pm created a budget line';
  exception when insufficient_privilege then null;
  end;

  if exists (select 1 from public.audit_log) then raise exception 'FAIL: pm reads audit_log'; end if;
end $$;
reset role;

-- ===========================================================================
-- executive (e1): read-only across modules
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.timesheets) < 2 then raise exception 'FAIL: executive cannot read all timesheets'; end if;
  if (select committed_pct from public.budget_summary where budget_line_id = '00000000-0000-0000-0000-00000000cc01') <> 90 then
    raise exception 'FAIL: budget_summary committed_pct wrong';
  end if;

  begin
    insert into public.budget_entries (budget_line_id, entry_type, amount)
    values ('00000000-0000-0000-0000-00000000cc01', 'realization', 1);
    raise exception 'FAIL: executive wrote a budget entry';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.feasibility_cases (title) values ('x');
    raise exception 'FAIL: executive submitted a case';
  exception when insufficient_privilege then null;
  end;

  update public.timesheets set status = 'approved' where id = '00000000-0000-0000-0000-00000000bb02';
  if (select status from public.timesheets where id = '00000000-0000-0000-0000-00000000bb02') <> 'submitted' then
    raise exception 'FAIL: executive approved a timesheet';
  end if;
end $$;
reset role;

-- ===========================================================================
-- chapter_lead (c1): decides with rationale; reads audit
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
do $$ begin
  begin
    update public.feasibility_cases set decision = 'go' where id = '00000000-0000-0000-0000-00000000dd01';
    raise exception 'FAIL: decision without rationale accepted';
  exception when check_violation then null;
  end;

  update public.feasibility_cases set decision = 'go', decision_rationale = 'Strategic fit', decided_by = '00000000-0000-0000-0000-0000000000a1'
  where id = '00000000-0000-0000-0000-00000000dd01';
  if (select decided_by from public.feasibility_cases where id = '00000000-0000-0000-0000-00000000dd01')
     is distinct from auth.uid() then
    raise exception 'FAIL: decided_by not stamped server-side';
  end if;

  if not exists (select 1 from public.audit_log where table_name = 'feasibility_cases') then
    raise exception 'FAIL: feasibility change not audited / lead cannot read audit';
  end if;

  begin
    insert into public.audit_log (table_name, action) values ('x', 'INSERT');
    raise exception 'FAIL: audit_log accepted a direct insert';
  exception when insufficient_privilege then null;
  end;

  -- approves a report of someone else (not own)
  update public.timesheets set status = 'approved' where id = '00000000-0000-0000-0000-00000000bb02';
  if (select status from public.timesheets where id = '00000000-0000-0000-0000-00000000bb02') <> 'approved' then
    raise exception 'FAIL: chapter_lead cannot approve';
  end if;
end $$;
reset role;

-- submitter cannot edit a decided case
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
do $$ begin
  update public.feasibility_cases set title = 'changed' where id = '00000000-0000-0000-0000-00000000dd01';
  if (select title from public.feasibility_cases where id = '00000000-0000-0000-0000-00000000dd01') <> 'Test Case' then
    raise exception 'FAIL: submitter edited a decided case';
  end if;
end $$;
reset role;

-- ===========================================================================
-- admin (a1): manages roles; cannot read private chats; cannot self-demote
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
do $$ begin
  update public.profiles set role = 'talent' where id = '00000000-0000-0000-0000-000000000091';
  if (select role from public.profiles where id = '00000000-0000-0000-0000-000000000091') <> 'talent' then
    raise exception 'FAIL: admin cannot assign role';
  end if;

  if exists (select 1 from public.chat_conversations) then
    raise exception 'FAIL: admin reads another user''s chat';
  end if;

  begin
    update public.profiles set role = 'talent' where id = auth.uid();
    raise exception 'FAIL: admin demoted self';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- deactivated user loses access
update public.profiles set is_active = false where id = '00000000-0000-0000-0000-0000000000f2';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}', true);
do $$ begin
  if exists (select 1 from public.projects) then raise exception 'FAIL: inactive user reads projects'; end if;
end $$;
reset role;

-- ===========================================================================
-- Migration 5: leave reduces capacity; timesheet_compliance scope
-- ===========================================================================
select set_config('request.jwt.claims', '', true);  -- maintenance context
insert into public.timesheets (id, profile_id, project_id, activity_id, work_date, hours, status) values
  ('00000000-0000-0000-0000-00000000bb03', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000aa01',
   (select id from public.activities where code = 'LEA'), current_date - 3, 8, 'submitted');

-- approval needs a real reviewer: t1's manager
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
update public.timesheets set status = 'approved' where id = '00000000-0000-0000-0000-00000000bb03';
reset role;

do $$ begin
  if (select status from public.timesheets where id = '00000000-0000-0000-0000-00000000bb03') <> 'approved' then
    raise exception 'FAIL: manager could not approve leave entry';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);
do $$
declare
  u record;
begin
  select * into u from public.utilization_monthly
  where profile_id = auth.uid() and period_month = date_trunc('month', current_date - 3)::date;
  if u.leave_hours <> 8 then raise exception 'FAIL: leave_hours should be 8, got %', u.leave_hours; end if;
  if u.approved_hours <> 8 then raise exception 'FAIL: leave counted as work (approved_hours %)', u.approved_hours; end if;
  if u.capacity_hours <> u.base_capacity_hours - 8 then raise exception 'FAIL: leave did not reduce capacity'; end if;

  if exists (select 1 from public.timesheet_compliance(date_trunc('week', current_date)::date) where profile_id <> auth.uid()) then
    raise exception 'FAIL: talent sees others in compliance';
  end if;
  if not exists (select 1 from public.timesheet_compliance(date_trunc('week', current_date)::date) where profile_id = auth.uid()) then
    raise exception 'FAIL: talent missing from own compliance';
  end if;
  if exists (select 1 from public.timesheet_compliance(current_date - (extract(isodow from current_date)::int) + 2)) then
    raise exception 'FAIL: compliance accepted a non-Monday week_start';
  end if;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
do $$ begin
  if not exists (select 1 from public.timesheet_compliance(date_trunc('week', current_date)::date)
                 where profile_id = '00000000-0000-0000-0000-0000000000f1') then
    raise exception 'FAIL: manager missing direct report in compliance';
  end if;
  if exists (select 1 from public.timesheet_compliance(date_trunc('week', current_date)::date)
             where profile_id = '00000000-0000-0000-0000-0000000000f2') then
    raise exception 'FAIL: manager sees non-report in compliance';
  end if;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000092","role":"authenticated"}', true);
do $$ begin
  if exists (select 1 from public.timesheet_compliance(date_trunc('week', current_date)::date)) then
    raise exception 'FAIL: guest reads compliance';
  end if;
end $$;
reset role;

-- ===========================================================================
-- UI write paths (my-week.tsx): grid upsert, upsert into a locked row, weekly submit
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);
do $$
declare
  n int;
begin
  -- grid save = upsert on the unique key; existing draft INT row gets new hours
  insert into public.timesheets (profile_id, project_id, activity_id, work_date, hours, status)
  values (auth.uid(), '00000000-0000-0000-0000-00000000aa01', (select id from public.activities where code = 'INT'),
          current_date, 6, 'draft')
  on conflict (profile_id, project_id, activity_id, work_date)
  do update set hours = excluded.hours, status = excluded.status;
  if (select hours from public.timesheets where profile_id = auth.uid() and work_date = current_date
      and activity_id = (select id from public.activities where code = 'INT')) <> 6 then
    raise exception 'FAIL: grid upsert did not update the draft row';
  end if;

  -- upsert over a submitted (locked) row must be refused
  begin
    insert into public.timesheets (profile_id, project_id, activity_id, work_date, hours, status)
    values (auth.uid(), '00000000-0000-0000-0000-00000000aa01', (select id from public.activities where code = 'TRN'),
            current_date, 1, 'draft')
    on conflict (profile_id, project_id, activity_id, work_date)
    do update set hours = excluded.hours, status = excluded.status;
    raise exception 'FAIL: upsert changed a submitted row';
  exception when insufficient_privilege then null;
  end;

  -- weekly submit, exactly as the UI does it
  update public.timesheets set status = 'submitted'
  where profile_id = auth.uid()
    and work_date between date_trunc('week', current_date)::date and date_trunc('week', current_date)::date + 6
    and status in ('draft', 'rejected');
  get diagnostics n = row_count;
  if n < 1 then raise exception 'FAIL: weekly submit updated no rows'; end if;
  if exists (select 1 from public.timesheets where profile_id = auth.uid() and work_date = current_date and status = 'draft') then
    raise exception 'FAIL: draft rows remain after weekly submit';
  end if;
end $$;
reset role;

-- ===========================================================================
-- Migration 7: profile edit rights, app_settings, staffing, squad heatmap
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);
do $$ begin
  begin
    update public.profiles set squad = 'Squad X' where id = auth.uid();
    raise exception 'FAIL: talent changed own squad';
  exception when insufficient_privilege then null;
  end;
  update public.profiles set location = 'Bandung' where id = auth.uid();
  if (select location from public.profiles where id = auth.uid()) <> 'Bandung' then
    raise exception 'FAIL: talent cannot update own location';
  end if;

  -- own competency
  insert into public.profile_skills (profile_id, skill_id, level, is_certified)
  values (auth.uid(), (select id from public.skills where name = 'Data Analytics'), 4, true);

  if (select count(*) from public.app_settings) < 4 then raise exception 'FAIL: member cannot read app_settings'; end if;
  update public.app_settings set value = 1 where key = 'utilization_over_pct';
  if (select value from public.app_settings where key = 'utilization_over_pct') <> 100 then
    raise exception 'FAIL: talent changed app_settings';
  end if;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
do $$ begin
  update public.profiles set squad = 'Squad Alpha', grade = 'G7' where id = '00000000-0000-0000-0000-0000000000f1';
  if (select squad from public.profiles where id = '00000000-0000-0000-0000-0000000000f1') <> 'Squad Alpha' then
    raise exception 'FAIL: manager cannot set direct report squad';
  end if;

  begin
    update public.profiles set full_name = 'Renamed' where id = '00000000-0000-0000-0000-0000000000f1';
    raise exception 'FAIL: manager renamed a report';
  exception when insufficient_privilege then null;
  end;

  update public.profiles set squad = 'Squad Z' where id = '00000000-0000-0000-0000-0000000000f2';
  if (select squad from public.profiles where id = '00000000-0000-0000-0000-0000000000f2') is not distinct from 'Squad Z' then
    raise exception 'FAIL: manager changed a non-report squad';
  end if;

  if not exists (
    select 1 from public.staffing_candidates((select id from public.skills where name = 'Data Analytics'), 3,
                                              date_trunc('month', current_date)::date)
    where profile_id = '00000000-0000-0000-0000-0000000000f1' and skill_level = 4 and is_certified
  ) then
    raise exception 'FAIL: staffing_candidates missed a qualified talent';
  end if;
  if exists (
    select 1 from public.staffing_candidates((select id from public.skills where name = 'Data Analytics'), 5,
                                              date_trunc('month', current_date)::date)
  ) then
    raise exception 'FAIL: staffing_candidates ignored min level';
  end if;
  if exists (select 1 from public.staffing_candidates(null, 1, current_date - (extract(day from current_date)::int) + 2)) then
    raise exception 'FAIL: staffing_candidates accepted a non-first-of-month date';
  end if;
end $$;
reset role;

-- allocation register as the UI writes it (upsert on the unique key)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
do $$ begin
  insert into public.allocations (profile_id, project_id, period_month, percent)
  values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000aa01', date_trunc('month', current_date)::date, 40)
  on conflict (profile_id, project_id, period_month) do update set percent = excluded.percent;
  insert into public.allocations (profile_id, project_id, period_month, percent)
  values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000aa01', date_trunc('month', current_date)::date, 70)
  on conflict (profile_id, project_id, period_month) do update set percent = excluded.percent;
  if (select percent from public.allocations where profile_id = '00000000-0000-0000-0000-0000000000f1'
      and project_id = '00000000-0000-0000-0000-00000000aa01' and period_month = date_trunc('month', current_date)::date) <> 70 then
    raise exception 'FAIL: pm allocation upsert did not update';
  end if;

  begin
    insert into public.allocations (profile_id, project_id, period_month, percent)
    values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000aa02', date_trunc('month', current_date)::date, 10);
    raise exception 'FAIL: pm allocated to a project they do not manage';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.allocations (profile_id, project_id, period_month, percent)
    values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000aa01', current_date - (extract(day from current_date)::int) + 2, 10);
    raise exception 'FAIL: allocation accepted a non-first-of-month period';
  exception when check_violation or insufficient_privilege then null;
  end;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000092","role":"authenticated"}', true);
do $$ begin
  if exists (select 1 from public.app_settings) then raise exception 'FAIL: guest reads app_settings'; end if;
  if exists (select 1 from public.staffing_candidates()) then raise exception 'FAIL: guest gets staffing candidates'; end if;
  if exists (select 1 from public.utilization_squad_monthly) then raise exception 'FAIL: guest reads squad heatmap'; end if;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
do $$ begin
  if not exists (select 1 from public.utilization_squad_monthly where squad = 'Squad Alpha') then
    raise exception 'FAIL: executive cannot read squad heatmap';
  end if;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
do $$ begin
  update public.app_settings set value = 110 where key = 'utilization_over_pct';
  if (select value from public.app_settings where key = 'utilization_over_pct') <> 110 then
    raise exception 'FAIL: admin cannot change app_settings';
  end if;
  if (select updated_by from public.app_settings where key = 'utilization_over_pct') is distinct from auth.uid() then
    raise exception 'FAIL: app_settings.updated_by not stamped';
  end if;
end $$;
reset role;

select 'RLS matrix: ALL PASS' as result;

rollback;
