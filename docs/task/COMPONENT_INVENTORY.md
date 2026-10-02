# TANIA Component Inventory for Production Rewrite

Purpose: define the product, codebase, backend service, and infrastructure components needed for a production-grade TANIA rewrite.

Target architecture: monorepo with separated frontend, backend, shared packages, database migrations, and deployment assets.

## 1. Component Levels

TANIA components should be tracked at four levels:

1. **Monorepo code components**: folders and packages in the repository.
2. **Application/runtime services**: processes that run in production.
3. **Backend domain modules**: Go packages inside one or more services.
4. **Infrastructure components**: databases, storage, proxy, observability, secrets, CI/CD.

This separation matters because not every backend component needs to be a separate running service on day one. Some should start as Go modules inside `services/api`, then split only when operational evidence requires it.

## 2. Monorepo Code Components

Recommended repository shape:

```text
.
├── apps/
│   └── web/                       # SvelteKit frontend
├── services/
│   ├── api/                       # Go API service
│   ├── worker/                    # Go background worker
│   └── realtime/                  # Optional later: websocket/SSE gateway
├── packages/
│   ├── api-client/                # Generated TypeScript client from OpenAPI
│   ├── ui/                        # Shared Svelte UI components
│   ├── config/                    # Shared lint/format/build config
│   └── contracts/                 # OpenAPI/schema artifacts if separated
├── db/
│   ├── migrations/                # PostgreSQL migrations
│   ├── seeds/                     # Local/dev/demo seed data
│   ├── fixtures/                  # Test data
│   └── verification/              # Migration/data verification SQL
├── deploy/
│   ├── docker-compose/            # Local and simple VPS deployment
│   ├── container/                 # Dockerfiles, entrypoints
│   ├── k8s/                       # Optional later
│   └── terraform/                 # Optional later
├── tooling/
│   ├── scripts/                   # Dev/CI/migration scripts
│   └── ci/                        # Reusable CI helpers
└── docs/
    └── task/                      # Rewrite planning docs
```

| Component | Required? | Notes |
|---|---:|---|
| `apps/web` | Yes | SvelteKit user-facing app |
| `services/api` | Yes | Go API and business boundary |
| `services/worker` | Yes | Async jobs, scheduled tasks, imports/exports, reminders |
| `services/realtime` | Later | Only if websocket/SSE load justifies a separate process |
| `packages/api-client` | Yes | Generated TS client keeps FE/API contract typed |
| `packages/ui` | Should | Shared Svelte design system once repeated components emerge; follow `FRONTEND_COMPONENT_STANDARDS.md` |
| `packages/config` | Should | Shared ESLint/Prettier/TS/build config |
| `db/migrations` | Yes | Source-controlled PostgreSQL schema changes |
| `deploy/docker-compose` | Yes | Local and prod-like environment |
| `tooling/scripts` | Yes | Migration, seed, verification, data import/export helpers |

## 3. Production Runtime Services

| Runtime service | Runs as separate process? | Required for first production? | Responsibility |
|---|---:|---:|---|
| Web frontend | Yes | Yes | Serves SvelteKit app/static assets |
| API service | Yes | Yes | Auth, IAM, RBAC, domain APIs, audit, AI tool execution |
| Worker service | Yes | Yes | Scheduled jobs, async imports/exports, reminders, report generation |
| Migration job | Job/process | Yes | Applies DB migrations during deploy pipeline |
| Realtime service | Optional | Later | Websocket/SSE notifications if polling becomes insufficient |
| AI gateway service | Optional | Later | Split from API only if AI orchestration needs isolation/scaling |
| Notification service | Optional | Later | Split from worker only if notification volume/complexity grows |

Recommended first deployment:

```text
web container
api container
worker container
postgres instance
object storage
reverse proxy
backup job
```

Avoid oversplitting initially. Keep IAM/RBAC/domain modules inside `services/api` until there is a real reason to split them into independent services.

## 4. Backend Service/Module Decomposition

### 4.1 API Service Modules

These are Go packages/modules inside `services/api` for the first production version.

| Module | Required? | Responsibility | Split into service later? |
|---|---:|---|---:|
| `auth` | Yes | Login/session validation, password/OIDC adapter | Maybe |
| `iam` | Yes | User lifecycle, activation, role assignment, PAT management | Maybe |
| `policy` | Yes | RBAC/resource/workflow authorization decisions | No, keep close to API/domain |
| `audit` | Yes | Immutable audit events and security event logging | Maybe |
| `profiles` | Yes | User profile CRUD, guest approval, org/reporting structure | No |
| `talent` | Yes | Talent directory, skills, staffing search | No |
| `talentprofile` | Yes | 360 profile, journey, evidence, performance, development plans | No |
| `projects` | Yes | Project/activity master data | No |
| `allocations` | Yes | Planned allocation and capacity model | No |
| `timesheets` | Yes | Weekly entries, submit/approve/reject workflow, compliance | No |
| `workload` | Yes | Utilization summaries, heatmap, overload alerts | No |
| `feasibility` | Yes | Case intake, scoring, resource check, decisions | No |
| `budget` | Yes | Budget lines, entries, summaries, thresholds | No |
| `dashboard` | Yes | Role-based KPI and summary endpoints | No |
| `copilot` | Yes | Read-only AI chat/briefing orchestration | Maybe, if AI load grows |
| `files` | Yes | Upload/download metadata, storage adapter, validation | Maybe |
| `importexport` | Yes | Excel parsing/generation orchestration | Maybe, heavy jobs run in worker |
| `settings` | Yes | App thresholds, quotas, feature flags | No |
| `notifications` | Should | Notify/remind users; API-facing preferences | Maybe |
| `observability` | Yes | Health, metrics, request IDs, logging helpers | No |

### 4.2 Worker Service Modules

| Module | Required? | Responsibility |
|---|---:|---|
| `scheduler` | Yes | Runs scheduled jobs or consumes scheduled job table |
| `jobs` | Yes | Job dispatcher/handler registry |
| `imports` | Yes | Heavy workbook imports and validation |
| `exports` | Yes | Report/export generation |
| `briefings` | Should | Precompute/cache copilot briefings if needed |
| `reminders` | Should | Timesheet/compliance reminders |
| `notifications` | Should | Email/Teams/Telegram delivery adapter |
| `cleanup` | Should | Expired tokens/sessions/files cleanup where safe |

### 4.3 Shared Backend Packages

| Package | Responsibility |
|---|---|
| `config` | Environment parsing and validation |
| `db` | PostgreSQL connection pool, transactions |
| `repository` | SQLC/pgx generated queries and repo wrappers |
| `errors` | Consistent API/domain error model |
| `logging` | Structured logger setup |
| `telemetry` | Metrics/tracing instrumentation |
| `clock` | Time abstraction for tests |
| `crypto` | PAT/token hashing helpers |
| `validation` | Shared server-side validators |

## 5. IAM and RBAC Components

IAM and RBAC should be explicit components, not scattered checks.

### 5.1 IAM Components

| Component | Type | Responsibility |
|---|---|---|
| Identity provider adapter | Go module | Local auth, Supabase Auth, or OIDC abstraction |
| Session manager | Go module + DB/Redis optional | Browser session creation, validation, revocation |
| User lifecycle manager | Go module | Guest approval, activation/deactivation, profile identity mapping |
| Role assignment manager | Go module | Admin-controlled role changes, manager assignment |
| PAT manager | Go module + DB table | Token create/list/revoke/verify, scopes, expiry, last-used |
| IAM audit writer | Go module | Audits IAM-sensitive events |
| Admin IAM UI | Svelte routes | User approval, role assignment, token metadata/revocation |

### 5.2 RBAC/Policy Components

| Component | Type | Responsibility |
|---|---|---|
| Role matrix | Code + docs | Current role permission baseline |
| Resource policy engine | Go module | Own/direct-report/reporting-line/all decisions |
| Scope checker | Go module | PAT scope gating before RBAC/resource policy |
| Workflow guard | Domain module | State transitions such as timesheet approval and feasibility decisions |
| Policy test suite | Tests | Matrix tests for allowed/denied cases |
| Policy context loader | Go module | Loads actor, role, active status, manager/reporting scope |

Effective access must be evaluated as:

```text
active identity
+ valid session or PAT
+ token scope if PAT
+ RBAC role
+ resource policy
+ workflow state
```

## 6. Database Components

PostgreSQL should be a dedicated production instance, not embedded in the app container.

| Database component | Required? | Notes |
|---|---:|---|
| PostgreSQL primary instance | Yes | Source of truth; dedicated managed DB or separate container/VM |
| Migration runner | Yes | Runs schema migrations from CI/CD or deploy job |
| Backup job/storage | Yes | Scheduled backups and tested restore process |
| Read replica | Later | Only if reporting/read load requires it |
| Connection pooler | Should | PgBouncer if connection count becomes a problem |
| Migration verification SQL | Yes | Checks schema/data assumptions after migration |
| Seed/fixture database data | Yes | Local/dev/test only, separated from prod |
| Audit/event tables | Yes | Immutable business/security audit trail |
| Outbox/job tables | Should | Reliable background processing if using Postgres queue |
| Search indexes | Should | Start with Postgres FTS/trigram; dedicated search later only if needed |

### 6.1 Core Schemas/Tables

| Area | Tables/objects |
|---|---|
| IAM | identities, profiles/users, api_tokens, sessions if DB-backed |
| RBAC | roles if data-driven, role grants/history if needed |
| Organization | manager relationships, squads/chapters if normalized |
| Talent | skills, profile_skills, talent positions/projects/certs/evidence |
| Workload | allocations, capacity settings, utilization views |
| Timesheet | timesheets, activities, workflow timestamps |
| Feasibility | cases, required skills, decision records |
| Budget | budget lines, budget entries, summaries/views |
| Copilot | conversations, messages, briefing cache, AI request log |
| Files | file metadata, ownership, storage keys |
| Audit | audit_log / security events |
| Jobs | job queue/outbox, job attempts, dead-letter records |
| Settings | app_settings, quotas, feature flags |

### 6.2 Database Ownership Rule

Only backend services connect to PostgreSQL.

```text
SvelteKit frontend -> Go API -> PostgreSQL
```

Frontend must not receive database credentials and must not connect directly to PostgreSQL.

## 7. Infrastructure Components

| Component | Required? | Suggested first choice | Notes |
|---|---:|---|---|
| Reverse proxy / ingress | Yes | Caddy, Nginx, or Traefik | TLS termination, routing web/api |
| TLS certificates | Yes | Reverse proxy ACME or platform certs | Required for secure cookies/PAT transport |
| Secret manager | Yes | Environment-specific secrets first; Vault/1Password/SSM later | No secrets in repo |
| PostgreSQL instance | Yes | Managed Postgres or dedicated container/VM | Dedicated data volume/backups |
| Object storage | Yes | S3-compatible/MinIO for dev | Evidence, imports, exports, attachments |
| Redis/cache | Should | Redis | Sessions/cache/rate limit/job coordination if needed |
| Queue/job backend | Should | Postgres outbox first; Redis/Asynq later | Start simple unless throughput requires more |
| Email/notification provider | Should | SMTP/API provider TBD | Reminders and workflow notification |
| AI provider/gateway | Yes | MIDAS/Anthropic-compatible config | Backend-only secrets |
| Observability logs | Yes | Structured stdout + central collection | Request IDs, actor IDs where safe |
| Metrics | Yes | Prometheus/OpenTelemetry | API latency, DB, jobs, AI usage |
| Tracing | Should | OpenTelemetry | Useful once services split |
| Error tracking | Should | Sentry/self-hosted equivalent optional | FE/BE runtime errors |
| Backup storage | Yes | Object storage / backup bucket | Restore drill required |
| CI/CD | Yes | GitHub Actions or internal runner | Build/test/migrate/deploy |
| Container registry | Yes | GitHub Container Registry or internal registry | Versioned images |
| Staging environment | Yes | Separate stack | Required before production |

## 8. Frontend UI Components

### Shell and Navigation

- App shell/layout
- Top bar / user menu
- Sidebar or module navigation
- Breadcrumbs
- Role-aware menu renderer
- Loading/error/empty states
- Responsive drawer/mobile navigation

### IAM / Admin UI

- Login page
- Waiting-access page for `guest`
- Account settings
- API token settings page
- Token create dialog
- One-time token reveal screen
- Token list/revoke table
- Admin user list
- Guest approval queue
- Role assignment form
- Manager/reporting-line assignment form
- User activate/deactivate controls
- IAM audit viewer

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

## 9. Backend Domain Components

| Domain | Backend components |
|---|---|
| Auth | session/JWT validation, identity provider adapter, password/OIDC support decision |
| IAM | user lifecycle, role assignment, activation, PAT management, IAM audit |
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

## 10. Components That Need Product/Engineering Confirmation

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
11. Session storage: signed cookies only, DB-backed sessions, Redis-backed sessions, or hybrid.
12. Queue backend: Postgres outbox first vs Redis/Asynq from day one.
13. Postgres deployment: managed DB vs self-hosted dedicated instance.
14. Object storage deployment: managed S3-compatible vs self-hosted MinIO.
15. Service split timing: keep modules in API first vs split IAM/copilot/import-export early.

## 11. Recommended First Component Slice

Build the smallest production foundation first:

1. `services/api`: health check, config, DB connection, migration check, structured logging.
2. `db/migrations`: baseline schema skeleton for identities/profiles/roles/audit/api_tokens.
3. `apps/web`: SvelteKit shell, login placeholder, app layout.
4. IAM foundation: guest flow, admin approval, role assignment, active/inactive user state.
5. RBAC/policy context: actor loading and matrix tests for guest/talent/manager/admin.
6. PAT foundation: create/list/revoke/verify token, scope checks.
7. OpenAPI contract and generated TypeScript client.
8. Docker Compose with web + api + worker + postgres + object storage.
9. CI checks for Go tests, Svelte typecheck, migration validation, Docker build.

Only after this foundation passes should module porting begin.

## 12. Recommended Initial Deployment Topology

```text
Internet / Internal Network
        │
        ▼
Reverse Proxy / TLS
   ├── /              -> web container
   └── /api/*         -> api container

api container
   ├── PostgreSQL primary instance
   ├── Object storage
   ├── Redis/cache optional
   └── AI provider/gateway

worker container
   ├── PostgreSQL primary instance
   ├── Object storage
   └── Notification provider

backup job
   └── PostgreSQL backups -> backup storage
```

Minimum production instances/components:

- 1 web runtime
- 1 API runtime
- 1 worker runtime
- 1 PostgreSQL primary instance
- 1 object storage bucket/service
- 1 reverse proxy / ingress
- 1 backup job/storage target
- CI/CD + container registry
- logs/metrics collection

## 13. Split-Later Guidance

Do not split a module into a separate service just because it is conceptually separate. Split only when one of these happens:

- Different scaling profile.
- Different security boundary.
- Different deployment cadence.
- Long-running/heavy workload that harms API latency.
- Separate ownership/team boundary.
- Operational evidence from metrics.

Likely split candidates later:

- Copilot/AI gateway
- Import/export processor
- Notification service
- Realtime event gateway
- Reporting/analytics service

Keep these as modules first:

- IAM
- RBAC/policy
- Profiles
- Timesheets
- Budget
- Feasibility
- Talent
