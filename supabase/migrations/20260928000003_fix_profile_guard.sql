-- TANIA migration 12 — fix guard_profile_privileges (migration 11).
-- `changed || 'col'` was parsed as array || array-literal (22P02), which made
-- every non-admin profile update fail. Same rules, array_append instead.

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

  if new.role is distinct from old.role then changed := array_append(changed, 'role'); end if;
  if new.is_active is distinct from old.is_active then changed := array_append(changed, 'is_active'); end if;
  if new.manager_id is distinct from old.manager_id then changed := array_append(changed, 'manager_id'); end if;
  if new.email is distinct from old.email then changed := array_append(changed, 'email'); end if;
  if new.full_name is distinct from old.full_name then changed := array_append(changed, 'full_name'); end if;
  if new.location is distinct from old.location then changed := array_append(changed, 'location'); end if;
  if new.squad is distinct from old.squad then changed := array_append(changed, 'squad'); end if;
  if new.grade is distinct from old.grade then changed := array_append(changed, 'grade'); end if;
  if new.employee_id is distinct from old.employee_id then changed := array_append(changed, 'employee_id'); end if;
  if new.position_title is distinct from old.position_title then changed := array_append(changed, 'position_title'); end if;
  if new.organization is distinct from old.organization then changed := array_append(changed, 'organization'); end if;
  if new.career_level is distinct from old.career_level then changed := array_append(changed, 'career_level'); end if;
  if new.join_date is distinct from old.join_date then changed := array_append(changed, 'join_date'); end if;
  if new.photo_path is distinct from old.photo_path then changed := array_append(changed, 'photo_path'); end if;

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
