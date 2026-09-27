# TANIA — Portal Digital Product & Solution

Internal decision-support portal for Chapter Product & Solution (DPS), Digital Product, Telkom Indonesia.

| Module | Prefix | Purpose |
|---|---|---|
| Talent Management | TM | Talent profiles, competency matrix, assignment history, staffing search |
| Workload Analysis | WA | Planned allocation vs actual, utilization per person/squad, overload alerts |
| Project Timesheet | TS | Weekly effort entry, manager approval workflow, compliance tracking |
| Project Feasibility | PF | Case intake, weighted scoring, go/no-go/hold decision with audit trail |
| Budget Control | BC | Plan vs commitment vs realization per program/category, threshold alerts |
| Avatar / Copilot | AV | AI assistant: chat widget + proactive dashboard briefing panel |

Requirement IDs (TM-01, WA-02, PF-04, AV-03, XM-01, …) refer to **`docs/PRD.md` (PRD v3.0 + Addendum B v3.1 + Addendum C v3.2)**; Talent Profile IDs (TP-001…) refer to `docs/prd-talent.md`, which consolidates and supersedes Requirement Document v1.0, PRD v2.0, and the Avatar Addendum. When implementing a feature, name the requirement ID it satisfies in the commit message.

---

## 1. Stack (do NOT change without explicit approval)

- **Frontend**: Next.js (App Router) with `output: 'export'` and `images: { unoptimized: true }` — **pure static export**.
  - FORBIDDEN: SSR, API routes, route handlers, server actions, middleware requiring a server, `next/headers`, `next/cookies` server-side. If a library needs any of these, find another library.
  - `npm run build` must produce `out/` with zero errors. Run it after completing every feature — static export breaks silently.
- **UI**: Tailwind CSS + shadcn/ui. Accent color Telkom red `#E1231A`. UI text: **Bahasa Indonesia**. Code, comments, commits: **English**.
- **Backend**: Supabase only (PostgreSQL + Auth + Storage + Edge Functions) via `@supabase/supabase-js`. No custom API layer anywhere.
- **Hosting**: Vercel Hobby (free) with GitHub auto-deploy — every push to `main` deploys automatically; no deploy quota. Hobby terms are non-commercial: flag Vercel Pro when TANIA becomes an official system. TANIA remains a **static export** on Vercel — never enable Vercel server features (SSR, serverless/edge functions on Vercel); the only server-side code stays in the Supabase Edge Function.
- **AI**: One Supabase Edge Function `tania-assistant` is the only LLM caller. It speaks the Anthropic Messages API (Anthropic SDK) either to Anthropic directly (default, `ANTHROPIC_API_KEY`) or to an Anthropic-compatible gateway configured by secrets `AI_BASE_URL` (host only, no `/v1`), `AI_API_KEY`, `AI_MODEL` — currently the ByNara router. Nothing else calls any LLM.

## 2. Security rules (non-negotiable)

1. The browser holds the `anon` key → **RLS is the only security boundary**. Every new table gets `enable row level security` + explicit policies **in the same migration**. A table without policies is a bug even if "temporary".
2. Authorization lives in RLS via `get_my_role()` / `is_manager_of()`. Roles (`executive`, `chapter_lead`, `manager`, `pm`, `talent`, `admin`, `guest`) live in `public.profiles.role`. Frontend role checks (hiding menus, disabling buttons) are UX sugar only — never the enforcement.
8. **Guest pattern (open registration)**: self-signup is ON; new users default to role `guest` with near-zero access — RLS must deny guests all reads except their own profile row. Guests land on `/menunggu-akses` until an admin assigns a role. Any policy written as `to authenticated using (true)` is a bug because it leaks to guests — scope it with `get_my_role() <> 'guest'` or tighter.
3. Never trust client-set values for `submitted_at`, `approved_by`, `decided_by`, `decided_at` — DB triggers stamp them. Don't build UI that writes these columns.
4. `service_role` key: exists only in local `.env` for `scripts/seed-users.mjs` (demo seeding) — never in frontend code, never in anything prefixed `NEXT_PUBLIC_`, never committed.
5. `talent` role has **zero** access to `budget_lines`/`budget_entries` (no SELECT policy). Don't build UI assuming otherwise; empty results for talent are correct behavior.
6. Chat (`chat_conversations`, `chat_messages`) and briefings (`copilot_briefings`) are private per user — never add admin/lead read policies to them.
7. Non-admins cannot change `role`, `is_active`, or `manager_id` on profiles (trigger `guard_profile_privileges` raises). Handle this error gracefully in UI.

## 3. Database reference

Schema changes ONLY via files in `supabase/migrations/` (`YYYYMMDDHHMMSS_name.sql`). Never edit an applied migration — create a new one. After any schema change:
`supabase gen types typescript --linked > src/lib/database.types.ts` and fix all type errors before finishing.

### Migrations (clean rebuild from PRD v3.1, 2026-09-27 — guest built in from the start)
1. `20260927000001_init_schema.sql` — enums (incl. `guest`), core tables, auth helpers (`get_my_role`, `is_member`, `has_role`, `is_manager_of`), views
2. `20260927000002_rls_policies.sql` — sign-up trigger (always `guest`), profile guard, timesheet workflow + feasibility decision triggers, audit triggers, RLS on every table, `attachments` bucket
3. `20260927000003_seed_master_data.sql` — 5 activities, 12 starter skills
4. `20260927000004_avatar_copilot.sql` — chat_conversations, chat_messages, copilot_briefings
5. `20260927000005_timesheet_compliance.sql` — `utilization_monthly` v2 (approved leave hours reduce capacity; adds `leave_hours`, `base_capacity_hours`), `timesheet_compliance(week_start)` RPC (security invoker)
6. `20260927000006_revoke_trigger_function_execute.sql` — trigger functions not callable via `/rpc`
7. `20260927000007_talent_workload.sql` — profile edit rights (owner: name/location; direct manager: squad/grade; admin: all), `app_settings` thresholds, `utilization_squad_monthly` view, `staffing_candidates(skill, min_level, month)` RPC
8. `20260927000008_feasibility_budget.sql` — `feasibility_resource_check(case_id)` RPC, GO-only case links on budget entries (trigger), `budget_monthly` view (burn rate)
9. `20260927000009_copilot_limits.sql` — copilot daily quotas in `app_settings` (50 chat questions, 5 briefing generations per user per day), `copilot_briefings.generation_count`
10. `20260928000001_hr_role.sql` — adds `hr` to `user_role` (own migration: enum values must commit before use)
11. `20260928000002_talent_profile.sql` — Talent Profile (Addendum C): profile work attributes, `skills.kind` (unique name+kind), `level_scales`, assessment metadata on `profile_skills`, `talent_positions/projects/certifications/evidence`, `performance_reviews/scores`, `development_plans/activities`, private `talent_ai_requests`, views `competency_gaps` + `talent_certification_status`, RPC `talent_context()`, helpers `is_in_reporting_line/can_view_talent/can_develop_talent`, bucket `talent-files`
12. `20260928000003_fix_profile_guard.sql` — fixes migration 11's profile guard (array append)

Status: **applied** (1–12) to project `tmzwlurjwantvuptpvpe` (https://tmzwlurjwantvuptpvpe.supabase.co). After any schema change run `supabase/tests/rls_matrix.sql` (transactional, rolls back) — it must end with `RLS matrix: ALL PASS`; also `supabase/tests/talent_profile.sql` (`Talent Profile RLS: ALL PASS`). Run it with `npx supabase db query --linked -f supabase/tests/rls_matrix.sql`.

Helpers: `is_member()` = active and not guest — the gate for reading module data. Inactive users resolve to no role (zero access). `feasibility_required_skills` (case × skill × min_level × headcount) feeds the resource check (PF-03).

### Enums
`user_role`: executive | chapter_lead | manager | pm | talent | admin | guest (new-user default, near-zero access)
`project_status`: candidate | active | on_hold | completed | cancelled
`activity_category`: delivery | presales | internal | leave | training
`timesheet_status`: draft | submitted | approved | rejected
`feasibility_decision`: go | no_go | hold
`budget_entry_type`: commitment | realization
`chat_role`: user | assistant

### Tables (key behaviors to remember)
- **profiles** — 1:1 with `auth.users` (auto-created by trigger on signup). Cols: full_name, email, role, squad, grade, location, manager_id, is_active.
- **skills** / **profile_skills** — competency matrix; level 1–5, is_certified. PK (profile_id, skill_id) → use upsert.
- **projects** (code unique, pm_id) / **activities** (code unique: DEL, PRE, INT, LEA, TRN).
- **allocations** — planned %, unique (profile_id, project_id, period_month); `period_month` MUST be the 1st of the month (check constraint). Percent 0–150.
- **timesheets** — unique (profile_id, project_id, activity_id, work_date) → weekly grid saves MUST upsert on that key. Hours 0–24. Status transitions: talent edits only in draft/rejected and may set submitted; approve/reject only by manager-of-row or chapter_lead/admin. Trigger stamps submitted_at/approved_by.
- **feasibility_cases** — 5 score columns (0–5); `total_score` is a **generated column** (weights 25/25/20/15/15, scale 0–100) — never write it. Recording a decision requires non-empty `decision_rationale` (trigger raises otherwise); decided_by/decided_at stamped by trigger. Editable by submitter only while decision is null.
- **budget_lines** — unique (fiscal_year, program, category). Plan only; **never** store committed/realized here.
- **budget_entries** — commitment/realization amounts, optional link to feasibility_case_id.
- **audit_log** — populated by triggers on profiles, timesheets, feasibility, budget tables. Read: chapter_lead/admin only. Never insert directly.
- **chat_conversations / chat_messages / copilot_briefings** — Avatar storage; token usage columns exist for cost reporting. Private per user (see rule 2.6).

### Views (query these, don't re-aggregate client-side)
- **utilization_monthly** — per person per month: approved_hours, capacity_hours (8h × Mon–Fri), utilization_pct. Source for WA screens & dashboard.
- **budget_summary** — per budget line: plan, committed, realized, remaining. Source for BC screens & dashboard.
Both are `security_invoker` → results already respect the caller's RLS.

### Role permission matrix (summary of RLS)
| | talent | pm | manager | chapter_lead | executive | admin |
|---|---|---|---|---|---|---|
| Own profile/skills/timesheet | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD |
| Others' timesheets | – | – | direct reports (approve) | all | read all | all |
| Allocations | read | write | write | write | read | write |
| Projects/activities master | read | own project | write | write | read | write |
| Feasibility submit / decide | read / – | submit / – | submit / – | submit / **decide** | read / – | submit / decide |
| Budget | **none** | read + entries | read + entries | full | read | full |
| Audit log | – | – | – | read | – | read |
| Admin (roles, users) | – | – | – | – | – | full |

## 4. Avatar / Copilot rules

- AI keys (`ANTHROPIC_API_KEY`, `AI_API_KEY`) exist ONLY as Supabase Edge Function secrets. Never in frontend, `NEXT_PUBLIC_*`, or the repo. When `AI_BASE_URL` is set the function uses `AI_API_KEY` only — the Anthropic key is never sent to a gateway.
- All Avatar DB reads use the **caller's JWT** (RLS enforced). Never use `service_role` inside `tania-assistant`.
- Avatar is **READ-ONLY**. Do not add tools that insert/update/delete. For actions, the bot directs users to the module page. (A future "Flows/actions with human approval" phase requires explicit approval first.)
- Endpoint contract — `POST /functions/v1/tania-assistant`, header `Authorization: Bearer <session access_token>`:
  - Chat: `{ mode: "chat", message, conversation_id? }` → `{ conversation_id, reply }`
  - Briefing: `{ mode: "briefing", force? }` → `{ reply, cached }` — cached per user per day in `copilot_briefings`; frontend calls it once on dashboard load. `force:true` only from an explicit refresh button.
- Cost caps — do not raise without approval: model Haiku, max_tokens 1024, history 12 messages, question 2000 chars, briefing 1/user/day.
- Copilot UI: dashboard uses a docked right panel (360px, bottom sheet on mobile) with role-based suggestion chips; other pages use the floating bubble. Answers render as markdown (bold numbers). KPI alert badges (utilization >100%, budget ≥80%/100%) are plain threshold logic — no LLM.

## 5. Frontend conventions

- Dynamic-import anything heavy: recharts, xlsx. Check bundle impact before adding dependencies.
- Paginate every list (`.range()`); never unfiltered `select('*')` on timesheets/audit_log (5 GB egress cap).
- Uploads → `attachments` bucket, ≤10 MB, validate client-side.
- Auth: email+password with **open registration** — new signups become `guest` and are routed to `/menunggu-akses` until an admin assigns a role on `/admin`. Public routes: `/` (home), `/login`, `/menunggu-akses`; everything else requires a non-guest session.
- Handle RLS-denied results as normal UX (empty state / friendly message), not as errors.
- File naming for exports: `TANIA_<modul>_<yyyy-mm-dd>.xlsx`.

## 6. Commands

```bash
npm run dev                                  # local dev
npm run build                                # static export → out/ (must pass)
npm run lint
supabase db push                             # apply new migrations
supabase gen types typescript --linked > src/lib/database.types.ts
supabase functions deploy tania-assistant    # after editing the edge function
node scripts/seed-users.mjs                  # demo users (local only)
```

## 7. Project structure

```
src/app/          # /login, /dashboard, /talent, /timesheet, /workload,
                  # /feasibility, /budget, /admin
src/components/   # shared (shadcn/ui under components/ui)
src/lib/          # supabase.ts (client singleton), database.types.ts (GENERATED — never hand-edit)
supabase/
  migrations/     # append-only SQL
  functions/tania-assistant/index.ts
scripts/          # seed-users.mjs (local, service_role)
docs/             # requirement doc, addendum, guides, runbooks
```

## 8. Workflow conventions

- One module/phase per session; `/clear` between modules.
- Non-trivial feature = plan first: propose an implementation plan, wait for approval, then code.
- One feature = one commit, message references requirement ID (e.g. `feat: timesheet approval (TS-02)`).
- Branch discipline: daily work on `dev`; merge to `main` when a feature is done — Vercel auto-deploys `main` on push (no deploy quota). Vercel preview deployments for PRs are fine.
- When a product decision is made in a session, append it to "Decisions" below in the same session.
- If a request conflicts with sections 1–4, say so and propose a compliant alternative — do not silently comply.

## 9. Environment & secrets

| Where | Keys |
|---|---|
| `.env.local` (gitignored) | NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY |
| `.env` (gitignored, seed script only) | SUPABASE_SERVICE_ROLE_KEY |
| Supabase secrets | ANTHROPIC_API_KEY |
| Vercel project env vars | NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY |
| GitHub repo secrets | SUPABASE_URL, SUPABASE_ANON_KEY (keep-alive workflow) |

## 10. Known constraints & assumptions

- Utilization capacity = 8h × Mon–Fri; national holidays not yet excluded (future: holiday calendar table).
- Feasibility scoring weights (25/25/20/15/15) are implemented as a generated column but pending management confirmation (Approval Gate AG-01, PRD §7.3 & §17). Planned follow-up: one migration replacing the generated column with a `scoring_config`-table-driven calculation so weights become configurable without deploys. Do not build this migration until AG-01 is signed; flag any request to change weights.
- Timesheet compliance assumes a chapter policy of weekly Friday submission.
- Demo phase runs on Supabase cloud free tier: project auto-pauses after 7 idle days (keep-alive workflow mitigates); no automatic backups (weekly dump workflow mitigates).
- CORS on tania-assistant is `*` during local/demo phase; must be tightened to the Vercel production domain at deploy.

## Decisions

- 2026-08: MVP capacity assumption = 8h × Mon–Fri, holidays excluded later.
- 2026-08: Budget committed/realized derived from `budget_entries` via `budget_summary` view — never stored on lines.
- 2026-08: Copilot briefing cached 1/user/day; regenerate only via explicit force.
- 2026-08: Avatar/Copilot chat history is strictly private per user (no admin access) — audit trail lives in module tables instead.
- 2026-08: Demo architecture = local Next.js + Supabase cloud free tier (no Docker), per `docs/TANIA_MVP_Demo_Local_MacBook.md`.
- 2026-09: PRD v3.0 adopted as the single requirement source (`docs/PRD.md`); it supersedes Requirement Doc v1.0, PRD v2.0, and the Avatar Addendum.
- 2026-09: Feasibility decision values in R1 = go/no_go/hold only; "conditional go" = hold + rationale, revisit in R2 (PRD Appendix A).
- 2026-09: SSO Entra ID moved from R1 to production hardening; MVP auth = email invite-only (PRD §11.2). **Superseded later in 2026-09** by open registration + guest (below).
- 2026-09: Production hosting moved Netlify → Vercel Hobby (GitHub auto-deploy, no deploy quota; non-commercial terms noted — plan Vercel Pro when official).
- 2026-09: Public HOME page at `/` (TANIA explainer + LOGIN button); registration opened with **guest** default role and admin-approval flow (`/menunggu-akses` → role assigned on `/admin`). Role set surfaced to users: Admin, Executive, Chapter Leader, Manager, Talent, Guest (pm retained internally for Feasibility).
- 2026-09-27: Clean rebuild from PRD v3.1 only; previous repos/migrations are not used. Migration set restarted at `20260927*` with `guest` in the enum from day one (no separate ADD VALUE migration needed).
- 2026-09-27: Timesheet reviewers can never approve their own rows; reviewers cannot edit content while approving. `utilization_monthly` only returns rows whose timesheets the caller may read (avoids false 0% for out-of-scope people). PM writes allocations only for projects where `pm_id` = self.
- 2026-09-27: Admin cannot change own role/is_active (lock-out guard). Guests may edit only `full_name`.
- 2026-09-27: Project `tmzwlurjwantvuptpvpe` held an older TANIA schema (invite-only, incl. `cost_rates`, `talent_performance`). Decision: reset schema public via the one-time `supabase/reset/reset_public_schema.sql` (not a migration), then push the clean set. Existing auth accounts are kept and backfilled as `guest` by migration 2.
- 2026-09-27: Approved hours on `leave`-category activities are not work: they reduce monthly capacity in `utilization_monthly` (capacity = 8h × Mon–Fri − approved leave).
- 2026-09-27: Timesheet grid shows Mon–Fri with an optional Sat–Sun toggle; weeks are ISO (Mon–Sun). Submit and approve/reject happen per person-week.
- 2026-09-27: Timesheet compliance covers active talent, pm, manager and chapter_lead (executive and admin are not expected to submit). Deadline: Friday.
- 2026-09-27: Master data (projects, activities) is managed on `/admin` (admin UI only for now; RLS also lets manager/chapter_lead write). Projects are never deleted — status completed/cancelled instead.
- 2026-09-27: Don't run `npm run build` while `npm run dev` is running — both write `.next/` and the dev server breaks.
- 2026-09-27: Squad and grade are set by admin or the person's direct manager (guard + `profiles_update_manager` policy); owners edit only full_name and location.
- 2026-09-27: Thresholds live in `app_settings` (admin-editable on /admin → Pengaturan): overload >100%, underload <60%, budget 80%/100%. Underload is flagged only for completed months; overload on planned (current/future) and actual (past/current).
- 2026-09-27: Staffing candidates = active talent, pm, manager; ranked by free capacity (100 − allocated %) then skill level. `staffing_candidates()` is the single source for TM-04 and the future PF-03 resource check.
- 2026-09-27: Talent profile lives at `/talent/profil?id=` (query param, because static export cannot pre-render per-user routes).
- 2026-09-27: Budget badge = max(committed %, realized %) of plan vs `app_settings` thresholds (80/100). A line with plan 0 and any spend is critical.
- 2026-09-27: Budget entries may link only to feasibility cases decided GO (DB trigger `budget_entry_case_guard`); unlinked entries are allowed.
- 2026-09-27: Resource check (PF-03): per required skill, people at ≥ min level with ≥50% free capacity in every month of the case period (start_month + duration, max 12 months); status cukup/parsial/kurang. Feasibility scores are labelled "indikatif" until AG-01 is signed.
- 2026-09-27: Feasibility attachments live in bucket `attachments` under `feasibility/<case_id>/`; case pages are `/feasibility/case?id=` (`id=baru` for intake).
- 2026-09-27: Copilot model = `claude-haiku-4-5` (PRD: Claude Haiku). Chat uses a manual tool loop (max 4 tool rounds, last round `tool_choice: none`) over 6 read-only tools; briefing is one call over a role-scoped snapshot. Guests/inactive users are rejected before any model call.
- 2026-09-27: Copilot daily quota 50 questions/user/day and 5 briefing generations/user/day (admin-editable in Pengaturan). Briefing token counts accumulate across refreshes so `supabase/reports/copilot_cost_monthly.sql` stays accurate.
- 2026-09-27: `tania-assistant` runs with `verify_jwt = false` (gateway verification doesn't support the project's asymmetric JWT signing keys); the function verifies every caller with `auth.getUser()` itself. CORS comes from the `ALLOWED_ORIGINS` secret. Model errors return a friendly message plus a non-secret `code` for diagnosis.
- 2026-09-27: `supabase/` is excluded from the app tsconfig (Deno code); type-check the function with `deno check` (nodeModulesDir auto).
- 2026-09-28: PRD v3.2 (Addendum C) adopts the Talent Profile (`docs/prd-talent.md`). It extends existing structures (profiles, skills, profile_skills, audit_log) instead of duplicating them; one route `/talent/profil?id=` with 11 tabs; "Profil Saya" menu.
- 2026-09-28: New role `hr` (HR / Talent Management): work attributes, career history, performance entry, certification verification; no budget or user admin. Talent Profile access = self, reporting line (direct + indirect), chapter_lead, hr, executive (read), admin.
- 2026-09-28: Assessment rules: owners self-assess (`source = self`); targets only by manager line/lead/HR/admin; gap = current − target on 0–100 (score, else level × 20), computed by the `competency_gaps` view. Certifications entered by talent stay `pending` until HR verifies; editing a verified certificate resets it to pending. Evidence is verified by the line/lead/HR, never by the talent.
- 2026-09-28: Performance history is HR-entered (`official`/`manual`), read-only for everyone else, audited; the AI has no write path. Talent AI (`mode: talent`) answers only from `talent_context()` with the caller's JWT and returns FACT / INFERENCE / RECOMMENDATION / UNKNOWN JSON (structured outputs). AI Insight is cached per viewer/profile/day; ask + journey count toward the daily copilot quota. A recommended journey becomes a development plan only when a user saves it.
- 2026-09-28: Unit tests use Vitest (`npm test`, `src/**/*.test.ts`); pure logic lives in `src/lib/talent-profile/calc.ts` and `permissions.ts`. Demo talent data only via `scripts/seed-talent-demo.mjs` (local, service role, `is_demo`, `--clean`).
- 2026-09-28: AI endpoint is configuration: `AI_BASE_URL=https://router.bynara.id` (ByNara, Anthropic-compatible `/v1/messages`), key `AI_API_KEY`, model `AI_MODEL` (default `claude-haiku-4-5`). Unset `AI_BASE_URL` to return to Anthropic directly. Talent AI retries once without `output_config` if the gateway rejects structured outputs, then validates the JSON. RISK (open, AG-09): talent/HR/performance data now transits a third-party router — confirm ByNara data retention & location before production use.
