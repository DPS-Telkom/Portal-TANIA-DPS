# TANIA Component Inventory for Production Rewrite

Purpose: list the product and platform components needed for a production-grade rewrite. This is not an implementation checklist yet; it is the component map to confirm before coding.

## 1. Application Components

| Component | Type | Needed for parity? | Notes |
|---|---|---:|---|
| Web app | SvelteKit app | Yes | Main user-facing portal |
| API service | Go service | Yes | All business workflows, auth, policy, audit, AI tool execution |
| PostgreSQL database | Database | Yes | Source of truth |
| Migration runner | Platform/tooling | Yes | Schema changes through CI/CD only |
| Background worker | Go service | Likely | Reminders, scheduled reports, heavy imports/exports, AI briefing generation |
| Object/file storage | Infrastructure | Likely | Attachments, talent evidence, generated exports/import originals |
| AI provider adapter | Backend component | Yes | MIDAS/Anthropic-compatible abstraction |
| Notification adapter | Backend component | Should | Email/Teams/Telegram/other reminders later |
| Admin console | Web module | Yes | Can live inside same SvelteKit app first |
| API token settings | Web + API component | Yes | Jira-like personal access token management for external control |

## 2. Frontend UI Components

### Shell and Navigation

- App shell/layout
- Top bar / user menu
- Sidebar or module navigation
- Breadcrumbs
- Role-aware menu renderer
- Loading/error/empty states
- Responsive drawer/mobile navigation

### Forms and Data Entry

- Text input
- Textarea
- Select/combobox
- Date picker
- Month picker
- Number/currency input
- File upload/dropzone
- Form section/card
- Validation error summary
- Confirmation dialog

### Data Display

- Data table with pagination/sorting/filtering
- KPI card
- Badge/status pill
- Timeline/activity history
- Detail drawer/panel
- Tabs
- Empty state
- Tooltip/help text
- Audit event viewer

### Module-Specific UI

- Talent profile header
- Skill/competency matrix
- Staffing candidate list
- Workbook import preview + row errors
- Weekly timesheet grid
- Timesheet approval queue
- Utilization heatmap
- Allocation table
- Feasibility scoring form
- Feasibility decision panel
- Budget summary cards/table
- Budget threshold alert
- Copilot chat panel
- Copilot briefing panel

### Visualization Components

- Utilization heatmap
- Budget burn/progress chart
- Workload distribution chart
- Feasibility score breakdown
- Talent gap visualization

Decision needed: choose a Svelte UI approach before implementation. Options include custom Tailwind components, Skeleton UI, Melt UI/Bits UI primitives, or a bespoke internal design system.

## 3. Backend Domain Components

| Domain | Backend components |
|---|---|
| Auth | session/JWT validation, identity provider adapter, password/OIDC support decision |
| Policy | role matrix, ownership checks, manager-reporting-line checks, module permissions |
| Profiles | profile CRUD, guest approval, role assignment, activation guard |
| Skills/Talent | skills, competency levels, certification, staffing search |
| Talent Profile | journey, evidence, performance, competency gaps, development plan |
| Projects | project master data, PM ownership, status handling |
| Allocations | monthly allocation CRUD, capacity rules |
| Timesheets | weekly entry, state machine, submit/approve/reject, compliance |
| Feasibility | case intake, scoring, resource check, decision workflow |
| Budget | lines, entries, summaries, threshold alerts |
| Dashboard | role-based aggregate summaries |
| Copilot | chat, briefing, read-only tools, quotas, provider adapter |
| Audit | immutable events, actor/context capture, query access |
| Import/export | workbook parsing, validation, generated exports |
| Settings | app thresholds, quotas, feature flags if needed |

## 4. Database Components

- Users/profiles
- Roles/permissions support tables if policy needs data-driven rules
- Skills and profile skills
- Talent profile detail tables
- Projects and activities
- Allocations
- Timesheets and workflow timestamps
- Feasibility cases and required skills
- Budget lines and budget entries
- Chat conversations/messages and briefing cache
- Audit log
- App settings
- File metadata table
- Outbox/job table if background worker uses Postgres queue

## 5. Infrastructure Components

| Component | Needed | Notes |
|---|---:|---|
| Dockerfiles | Yes | Web, API, worker |
| docker-compose | Yes | Local/prod-like development |
| Secret management | Yes | Per environment, no secrets in repo |
| Reverse proxy | Yes | Caddy/Nginx/Traefik depending deploy target |
| TLS | Yes | Usually handled by reverse proxy/load balancer |
| Database backups | Yes | Scheduled backup + restore drill |
| Logs | Yes | Structured logs from Go/Svelte runtime |
| Metrics | Yes | API latency, DB pool, job failures, AI cost/usage |
| Tracing | Should | Useful once services split |
| CI/CD | Yes | Test, build, scan, deploy |
| Staging environment | Yes | Required before production cutover |

## 6. Components That Need Product/Engineering Confirmation

1. Identity provider: Supabase Auth, internal email/password, or Telkom SSO/OIDC.
2. File storage: Supabase Storage, S3-compatible, MinIO, or internal object store.
3. Notification channel: email, Teams, Telegram, or defer.
4. Deployment model: single VPS containers, Kubernetes, or managed platform.
5. Search: PostgreSQL search first vs dedicated search service.
6. AI provider: MIDAS default, Anthropic fallback, or configurable per environment.
7. Audit retention: how long logs must be kept and who can read them.
8. Data migration: whether current Supabase data must be migrated or only schema/feature parity matters.
9. Multi-tenant scope: DPS only or future chapter/company separation.
10. Design system: custom Tailwind/Svelte components vs external UI library.

## 7. Recommended First Component Slice

Build the smallest production foundation first:

1. `services/api`: health check, config, DB connection, migration check, structured logging.
2. `db/migrations`: baseline schema skeleton for profiles/roles/audit.
3. `apps/web`: SvelteKit shell, login placeholder, app layout.
4. OpenAPI contract and generated TypeScript client.
5. Policy test matrix for guest/talent/manager/admin.
6. Docker Compose with web + api + postgres.

Only after this foundation passes should module porting begin.
