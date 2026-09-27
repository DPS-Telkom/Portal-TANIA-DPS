-- TANIA Talent Profile security test (prd-talent §21–23, TP-016).
-- One transaction, ROLLED BACK. Any failed assertion raises 'FAIL: …'.
-- Reporting line: b1 (manager) → b2 (manager) → t1 (talent); t2 is outside it.
-- Run: npx supabase db query --linked -f supabase/tests/talent_profile.sql

begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
select id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email,
       jsonb_build_object('full_name', name), '{}'::jsonb, now(), now()
from (values
  ('10000000-0000-0000-0000-0000000000a1', 'tp-admin@test.local', 'Admin'),
  ('10000000-0000-0000-0000-0000000000d1', 'tp-hr@test.local',    'HR'),
  ('10000000-0000-0000-0000-0000000000c1', 'tp-lead@test.local',  'Lead'),
  ('10000000-0000-0000-0000-0000000000e1', 'tp-exec@test.local',  'Exec'),
  ('10000000-0000-0000-0000-0000000000b1', 'tp-mgr1@test.local',  'Manager 1'),
  ('10000000-0000-0000-0000-0000000000b2', 'tp-mgr2@test.local',  'Manager 2'),
  ('10000000-0000-0000-0000-0000000000f1', 'tp-t1@test.local',    'Talent 1'),
  ('10000000-0000-0000-0000-0000000000f2', 'tp-t2@test.local',    'Talent 2'),
  ('10000000-0000-0000-0000-000000000091', 'tp-guest@test.local', 'Guest')
) as u(id, email, name);

update public.profiles set role = 'admin'        where id = '10000000-0000-0000-0000-0000000000a1';
update public.profiles set role = 'hr'           where id = '10000000-0000-0000-0000-0000000000d1';
update public.profiles set role = 'chapter_lead' where id = '10000000-0000-0000-0000-0000000000c1';
update public.profiles set role = 'executive'    where id = '10000000-0000-0000-0000-0000000000e1';
update public.profiles set role = 'manager'      where id = '10000000-0000-0000-0000-0000000000b1';
update public.profiles set role = 'manager', manager_id = '10000000-0000-0000-0000-0000000000b1'
  where id = '10000000-0000-0000-0000-0000000000b2';
update public.profiles set role = 'talent', manager_id = '10000000-0000-0000-0000-0000000000b2'
  where id = '10000000-0000-0000-0000-0000000000f1';
update public.profiles set role = 'talent', manager_id = '10000000-0000-0000-0000-0000000000c1'
  where id = '10000000-0000-0000-0000-0000000000f2';

-- ===========================================================================
-- HR: work attributes, career history, performance (read-only for others)
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
do $$ begin
  update public.profiles set employee_id = 'EMP-T1', position_title = 'Product Specialist',
         organization = 'DPS', career_level = 'Specialist', join_date = '2018-03-01'
   where id = '10000000-0000-0000-0000-0000000000f1';
  if (select position_title from public.profiles where id = '10000000-0000-0000-0000-0000000000f1') <> 'Product Specialist' then
    raise exception 'FAIL: HR cannot set work attributes';
  end if;
  begin
    update public.profiles set role = 'admin' where id = '10000000-0000-0000-0000-0000000000f1';
    raise exception 'FAIL: HR changed a role';
  exception when insufficient_privilege then null;
  end;

  insert into public.talent_positions (id, profile_id, position_title, organization, start_date)
  values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-0000000000f1', 'Analyst', 'DPS', '2018-03-01');

  insert into public.performance_reviews (id, profile_id, period_year, overall_score, source)
  values ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-0000000000f1', 2025, 84, 'official');
  insert into public.performance_scores (review_id, dimension, score)
  values ('20000000-0000-0000-0000-000000000002', 'Execution', 82);
  if (select recorded_by from public.performance_reviews where id = '20000000-0000-0000-0000-000000000002')
     is distinct from auth.uid() then
    raise exception 'FAIL: performance recorded_by not stamped';
  end if;
end $$;
reset role;

-- ===========================================================================
-- Talent t1 (own profile)
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);
do $$ begin
  if public.talent_context(auth.uid()) is null then raise exception 'FAIL: talent cannot read own context'; end if;
  if public.talent_context('10000000-0000-0000-0000-0000000000f2') is not null then
    raise exception 'FAIL: talent read another talent context';
  end if;
  if jsonb_array_length(public.talent_context(auth.uid()) -> 'performance_history') <> 1 then
    raise exception 'FAIL: talent cannot read own performance';
  end if;

  begin
    update public.profiles set position_title = 'Chief' where id = auth.uid();
    raise exception 'FAIL: talent changed own position_title';
  exception when insufficient_privilege then null;
  end;
  update public.profiles set photo_path = 'photos/10000000-0000-0000-0000-0000000000f1/a.png' where id = auth.uid();

  begin
    insert into public.talent_positions (profile_id, position_title, start_date) values (auth.uid(), 'CEO', '2020-01-01');
    raise exception 'FAIL: talent wrote career history';
  exception when insufficient_privilege then null;
  end;

  update public.performance_reviews set overall_score = 100 where profile_id = auth.uid();
  if (select overall_score from public.performance_reviews where profile_id = auth.uid()) <> 84 then
    raise exception 'FAIL: talent changed official performance';
  end if;
  begin
    insert into public.performance_reviews (profile_id, period_year, overall_score) values (auth.uid(), 2026, 99);
    raise exception 'FAIL: talent created a performance review';
  exception when insufficient_privilege then null;
  end;

  -- certification: self-claimed "verified" is forced to pending
  insert into public.talent_certifications (id, profile_id, name, issued_on, expires_on, verification)
  values ('20000000-0000-0000-0000-000000000003', auth.uid(), 'Cloud Practitioner', current_date - 300, current_date + 30, 'verified');
  if (select verification from public.talent_certifications where id = '20000000-0000-0000-0000-000000000003') <> 'pending' then
    raise exception 'FAIL: talent self-verified a certification';
  end if;
  begin
    update public.talent_certifications set verification = 'verified' where id = '20000000-0000-0000-0000-000000000003';
    raise exception 'FAIL: talent verified via update';
  exception when insufficient_privilege then null;
  end;

  -- competency: own level ok, own target refused
  insert into public.profile_skills (profile_id, skill_id, level)
  values (auth.uid(), (select id from public.skills where name = 'AI / GenAI' and kind = 'capability'), 2);
  if (select source from public.profile_skills where profile_id = auth.uid()
      and skill_id = (select id from public.skills where name = 'AI / GenAI' and kind = 'capability')) <> 'self' then
    raise exception 'FAIL: self assessment source not stamped';
  end if;
  begin
    update public.profile_skills set target_level = 5
     where profile_id = auth.uid() and skill_id = (select id from public.skills where name = 'AI / GenAI' and kind = 'capability');
    raise exception 'FAIL: talent set own target';
  exception when insufficient_privilege then null;
  end;

  -- project + evidence (cannot self-verify)
  insert into public.talent_projects (id, profile_id, name, role) values ('20000000-0000-0000-0000-000000000004', auth.uid(), 'Chatbot pilot', 'PM');
  begin
    insert into public.talent_evidence (profile_id, evidence_type, title, verified)
    values (auth.uid(), 'project', 'Chatbot pilot', true);
    raise exception 'FAIL: talent self-verified evidence';
  exception when insufficient_privilege then null;
  end;
  insert into public.talent_evidence (id, profile_id, skill_id, evidence_type, title, talent_project_id)
  values ('20000000-0000-0000-0000-000000000005', auth.uid(),
          (select id from public.skills where name = 'AI / GenAI' and kind = 'capability'),
          'project', 'Chatbot pilot', '20000000-0000-0000-0000-000000000004');

  -- development plan + activity completion stamp
  insert into public.development_plans (id, profile_id, title) values ('20000000-0000-0000-0000-000000000006', auth.uid(), 'AI track');
  insert into public.development_activities (id, plan_id, title, month_index)
  values ('20000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000006', 'AI PM course', 1);
  update public.development_activities set status = 'completed' where id = '20000000-0000-0000-0000-000000000007';
  if (select completed_at from public.development_activities where id = '20000000-0000-0000-0000-000000000007') is null then
    raise exception 'FAIL: completed_at not stamped';
  end if;

  -- private AI log: own profile ok, other talent refused
  insert into public.talent_ai_requests (profile_id, kind, response) values (auth.uid(), 'ask', '{}');
  begin
    insert into public.talent_ai_requests (profile_id, kind, response) values ('10000000-0000-0000-0000-0000000000f2', 'ask', '{}');
    raise exception 'FAIL: AI request logged for an unauthorized profile';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- ===========================================================================
-- Indirect manager b1: reads t1, sets targets, verifies evidence
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
do $$ begin
  if not public.is_in_reporting_line('10000000-0000-0000-0000-0000000000f1') then
    raise exception 'FAIL: indirect manager not in reporting line';
  end if;
  if public.talent_context('10000000-0000-0000-0000-0000000000f1') is null then
    raise exception 'FAIL: indirect manager cannot read report context';
  end if;
  if public.talent_context('10000000-0000-0000-0000-0000000000f2') is not null then
    raise exception 'FAIL: manager read a talent outside the reporting line';
  end if;

  update public.profile_skills set target_level = 4
   where profile_id = '10000000-0000-0000-0000-0000000000f1'
     and skill_id = (select id from public.skills where name = 'AI / GenAI' and kind = 'capability');
  if (select gap from public.competency_gaps where profile_id = '10000000-0000-0000-0000-0000000000f1'
      and skill_name = 'AI / GenAI') <> -40 then
    raise exception 'FAIL: gap should be 2*20 - 4*20 = -40';
  end if;
  if (select evidence_count from public.competency_gaps where profile_id = '10000000-0000-0000-0000-0000000000f1'
      and skill_name = 'AI / GenAI') <> 1 then
    raise exception 'FAIL: gap evidence_count';
  end if;

  update public.talent_evidence set verified = true where id = '20000000-0000-0000-0000-000000000005';
  if (select verified_by from public.talent_evidence where id = '20000000-0000-0000-0000-000000000005') is distinct from auth.uid() then
    raise exception 'FAIL: evidence verification not stamped';
  end if;

  begin
    insert into public.performance_reviews (profile_id, period_year, overall_score)
    values ('10000000-0000-0000-0000-0000000000f1', 2026, 90);
    raise exception 'FAIL: manager wrote performance';
  exception when insufficient_privilege then null;
  end;

  if exists (select 1 from public.talent_ai_requests) then raise exception 'FAIL: manager reads private AI log'; end if;
end $$;
reset role;

-- ===========================================================================
-- Outsider t2, guest, executive, HR verification
-- ===========================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-0000000000f2","role":"authenticated"}', true);
do $$ begin
  if exists (select 1 from public.talent_positions)       then raise exception 'FAIL: t2 reads positions'; end if;
  if exists (select 1 from public.performance_reviews)    then raise exception 'FAIL: t2 reads performance'; end if;
  if exists (select 1 from public.performance_scores)     then raise exception 'FAIL: t2 reads performance scores'; end if;
  if exists (select 1 from public.talent_certifications)  then raise exception 'FAIL: t2 reads certifications'; end if;
  if exists (select 1 from public.talent_evidence)        then raise exception 'FAIL: t2 reads evidence'; end if;
  if exists (select 1 from public.talent_projects)        then raise exception 'FAIL: t2 reads projects'; end if;
  if exists (select 1 from public.development_plans)      then raise exception 'FAIL: t2 reads plans'; end if;
  if exists (select 1 from public.competency_gaps where profile_id <> auth.uid()) then raise exception 'FAIL: t2 reads gaps'; end if;
  if exists (select 1 from storage.objects where bucket_id = 'talent-files') then raise exception 'FAIL: t2 reads talent files'; end if;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000091","role":"authenticated"}', true);
do $$ begin
  if public.talent_context(auth.uid()) is not null then raise exception 'FAIL: guest gets a talent context'; end if;
  if exists (select 1 from public.level_scales) then raise exception 'FAIL: guest reads level scales'; end if;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
do $$ begin
  if public.talent_context('10000000-0000-0000-0000-0000000000f1') is null then
    raise exception 'FAIL: executive cannot read talent context';
  end if;
  begin
    insert into public.development_plans (profile_id, title) values ('10000000-0000-0000-0000-0000000000f1', 'x');
    raise exception 'FAIL: executive wrote a development plan';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
do $$ begin
  update public.talent_certifications set verification = 'verified' where id = '20000000-0000-0000-0000-000000000003';
  if (select status from public.talent_certification_status where id = '20000000-0000-0000-0000-000000000003') <> 'EXPIRING' then
    raise exception 'FAIL: certification expiring in 30 days should be EXPIRING';
  end if;
  if (select verified_by from public.talent_certifications where id = '20000000-0000-0000-0000-000000000003') is distinct from auth.uid() then
    raise exception 'FAIL: certification verification not stamped';
  end if;
end $$;
reset role;

-- t1 edits a verified certificate → back to pending
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);
do $$ begin
  update public.talent_certifications set expires_on = current_date + 900 where id = '20000000-0000-0000-0000-000000000003';
  if (select status from public.talent_certification_status where id = '20000000-0000-0000-0000-000000000003') <> 'PENDING_VERIFICATION' then
    raise exception 'FAIL: edited certificate should need re-verification';
  end if;
end $$;
reset role;

select 'Talent Profile RLS: ALL PASS' as result;

rollback;
