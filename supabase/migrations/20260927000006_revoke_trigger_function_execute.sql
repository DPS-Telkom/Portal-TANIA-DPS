-- TANIA migration 6 — hardening (Supabase advisor 0028/0029)
-- Trigger functions must not be callable through /rest/v1/rpc. EXECUTE is
-- only checked when a trigger is created, so revoking it does not stop the
-- triggers from firing. Auth helpers (get_my_role, is_member, has_role,
-- is_manager_of) stay executable by `authenticated` because RLS policies
-- call them.

revoke execute on function public.set_updated_at()            from public, anon, authenticated;
revoke execute on function public.handle_new_user()           from public, anon, authenticated;
revoke execute on function public.guard_profile_privileges()  from public, anon, authenticated;
revoke execute on function public.timesheet_workflow()        from public, anon, authenticated;
revoke execute on function public.feasibility_decision_guard() from public, anon, authenticated;
revoke execute on function public.budget_entry_stamp()        from public, anon, authenticated;
revoke execute on function public.write_audit_log()           from public, anon, authenticated;
revoke execute on function public.chat_owner_stamp()          from public, anon, authenticated;
