-- ONE-TIME RESET before the clean v3.1 migrations (decision 2026-09-27).
-- DESTRUCTIVE: drops every table, view, function and type in schema public
-- (all rows in them are lost), clears the migration history, and removes the
-- old storage policies for the `attachments` bucket.
-- It does NOT touch auth.users (accounts are kept; migration 2 re-creates
-- their profiles as guest) or files already stored in buckets.
--
-- Run once in the Supabase SQL Editor, then `supabase db push`.
-- Never add this file to supabase/migrations.

begin;

do $$
declare
  r record;
begin
  -- views / materialized views
  for r in select viewname as name from pg_views where schemaname = 'public' loop
    execute format('drop view if exists public.%I cascade', r.name);
  end loop;
  for r in select matviewname as name from pg_matviews where schemaname = 'public' loop
    execute format('drop materialized view if exists public.%I cascade', r.name);
  end loop;

  -- tables (cascade removes their policies, triggers and FKs)
  for r in select tablename as name from pg_tables where schemaname = 'public' loop
    execute format('drop table if exists public.%I cascade', r.name);
  end loop;

  -- functions not owned by an extension (cascade removes triggers on
  -- auth.users and storage policies that call them)
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('drop function if exists %s cascade', r.sig);
  end loop;

  -- enums and domains not owned by an extension
  for r in
    select t.typname as name
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typtype in ('e', 'd')
      and not exists (select 1 from pg_depend d where d.objid = t.oid and d.deptype = 'e')
  loop
    execute format('drop type if exists public.%I cascade', r.name);
  end loop;

  -- leftover storage policies for the attachments bucket
  for r in
    select policyname as name
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') ilike '%attachments%' or coalesce(with_check, '') ilike '%attachments%')
  loop
    execute format('drop policy if exists %I on storage.objects', r.name);
  end loop;

  -- old migration history, so `supabase db push` starts from the new set
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    execute 'delete from supabase_migrations.schema_migrations';
  end if;
end $$;

-- Sanity check: public must be empty now.
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public')
  or exists (select 1 from pg_views where schemaname = 'public') then
    raise exception 'reset incomplete: objects remain in schema public';
  end if;
end $$;

commit;

select 'public schema reset — now run: supabase db push' as result;
