# TANIA Production Rewrite Plan

Status: draft architecture proposal

Goal: rewrite TANIA from the current MVP/static Supabase implementation into a production-grade monorepo while keeping the existing product scope and feature set intact.

## 1. Executive Summary

The current repository is a single Next.js static app backed directly by Supabase. That is good for MVP/demo speed, but production needs stronger separation between frontend, backend, data access, authorization, observability, release discipline, and integration boundaries.

The proposed production rewrite is a monorepo with:

- Frontend: SvelteKit / Svelte 5
- Backend: Go HTTP API
- Database: PostgreSQL
- Optional async workers: Go workers
- Optional AI gateway: backend-owned provider abstraction
- Shared API contract: OpenAPI generated from backend
- Deployment: containerized services with environment-based configuration

Existing feature modules remain in scope first. The rewrite should not change product behavior before parity is reached.

## 2. Target Repository Shape

```text
.
├── apps/
│   ├── web/                  # SvelteKit frontend
│   └── admin/                # Optional later: internal admin console if separated
├── services/
│   ├── api/                  # Go backend HTTP API
│   ├── worker/               # Optional Go background jobs
│   └── ai-gateway/           # Optional if AI needs isolated runtime/policy
├── packages/
│   ├── api-client/           # Generated TypeScript client from OpenAPI
│   ├── ui/                   # Shared Svelte UI components/design system
│   └── config/               # Shared lint/format/tsconfig tokens
├── db/
│   ├── migrations/           # PostgreSQL migrations
│   ├── seeds/                # Dev/demo seed data
│   └── fixtures/             # Test fixtures
├── docs/
│   ├── PRODUCTION_REWRITE_PLAN.md
│   ├── PRODUCTION_ARCHITECTURE.md
│   ├── FEATURE_PARITY_MATRIX.md
│   └── COMPONENT_INVENTORY.md
├── deploy/
│   ├── docker-compose/       # Local/prod-like compose
│   ├── k8s/                  # Optional later
│   └── terraform/            # Optional later
└── tooling/
    ├── scripts/
    └── ci/
```

Initial recommendation: keep `apps/web`, `services/api`, and `db` first. Add `worker`, `packages/ui`, and `packages/api-client` when the duplication or automation need is real.

## 3. Feature Parity Boundary

The first rewrite milestone must preserve all current TANIA feature areas:

| Module | Keep in rewrite? | Notes |
|---|---:|---|
| Talent Management | Yes | Profiles, skills, competency matrix, staffing search, import/export |
| Talent Profile | Yes | 360 profile, journey, certifications, evidence, performance, AI recommendations |
| Workload Analysis | Yes | Allocation, utilization, heatmap, overload alerts |
| Project Timesheet | Yes | Weekly entries, submit/reject/approve workflow, compliance |
| Project Feasibility | Yes | Intake, weighted scoring, resource check, audited decision |
| Budget Control | Yes | Plan, commitment, realization, threshold alerts |
| Dashboard/Beranda | Yes | Role-based KPIs, daily focus, navigation |
| Admin | Yes | User approval, role assignment, activation, master data |
| Avatar/Copilot AI | Yes | Read-only assistant with same authorization as caller |
| Audit Log | Yes | Server-side audit trail for sensitive state changes |
| Auth & RBAC | Yes | Replace direct Supabase Auth usage with production auth design |
| Excel import/export | Yes | Keep where it exists today; validate server-side in rewrite |

Out of scope for the first production rewrite: new business modules, payroll, HR system-of-record ownership, and write-capable AI actions.

## 4. Production Architecture Direction

```text
Browser
  │
  ▼
SvelteKit Web App
  │  HTTPS + session/JWT
  ▼
Go API Service
  ├── Auth/session validation
  ├── RBAC/ABAC authorization
  ├── Domain services
  ├── Audit logging
  ├── File/import/export orchestration
  ├── AI copilot policy + tool execution
  └── OpenAPI contract
       │
       ▼
PostgreSQL
  ├── App schema
  ├── Constraints
  ├── Views/materialized views where useful
  ├── Optional RLS for defense-in-depth
  └── Migration-managed changes only
```

Key shift from MVP:

- Frontend no longer talks directly to the database.
- Backend owns write workflows, validation, audit, authorization, AI tool access, and integration rules.
- PostgreSQL remains the source of truth with strong constraints.
- RLS can still be used as defense-in-depth, but the Go API becomes the primary application boundary.

## 5. Backend Design Principles

Use Go because the production rewrite needs predictable performance, maintainable APIs, strong concurrency, and simple deployment.

Recommended backend layout:

```text
services/api/
├── cmd/api/                  # main.go
├── internal/
│   ├── auth/                 # session/JWT, password/OIDC integration
│   ├── http/                 # router, middleware, handlers
│   ├── domain/               # business services per module
│   ├── repository/           # PostgreSQL access
│   ├── policy/               # authorization rules
│   ├── audit/                # audit event writer
│   ├── ai/                   # provider + tool execution
│   ├── export/               # Excel/PDF exports
│   └── config/               # environment config
├── migrations/               # if colocated, otherwise db/migrations
└── openapi.yaml
```

Suggested libraries, pending team preference:

- HTTP router: `chi` or standard library `net/http` with Go 1.22+ mux
- DB access: `pgx` + `sqlc` for typed queries
- Migrations: `golang-migrate`, `atlas`, or `goose`
- Validation: explicit Go validation at handler/service layer
- Logging: `slog`
- Metrics: OpenTelemetry + Prometheus-compatible exporter
- API docs: OpenAPI generated or maintained with CI validation

## 6. Frontend Design Principles

Use SvelteKit for a lean production frontend with clear route ownership, simpler state, and better performance profile.

Recommended frontend layout:

```text
apps/web/
├── src/
│   ├── routes/               # SvelteKit routes per module
│   ├── lib/
│   │   ├── api/              # generated/typed API client wrapper
│   │   ├── components/       # app-specific Svelte components
│   │   ├── design/           # tokens, typography, colors
│   │   ├── stores/           # session, role, filters
│   │   └── validation/       # client-side validation only for UX
│   └── hooks.server.ts       # session handling if SSR is used
├── static/
└── vite.config.ts
```

Frontend rules:

- UI text remains Bahasa Indonesia unless product decides otherwise.
- Frontend authorization is UX only; backend enforces permissions.
- Reuse route groups per module: dashboard, talent, workload, timesheet, feasibility, budget, admin, copilot.
- Prefer API-driven forms with optimistic UI only where safe.
- Keep Excel import/export interactions, but parsing/validation should be server-side for production integrity.

## 7. Database Direction

PostgreSQL remains the source of truth.

Keep:

- Relational model for profiles, skills, projects, timesheets, allocations, feasibility, budget, chat, audit.
- Constraints for generated/scored fields where stable.
- Views for reporting queries where they simplify API implementation.
- Migration-only schema changes.

Revisit:

- Current Supabase-specific auth coupling.
- Current RLS helpers that depend on `auth.uid()`.
- Free-tier assumptions and keep-alive/backup workaround.
- Edge Function-only AI integration.

Production database requirements:

- Migration checks in CI.
- Rollback plan or forward-only emergency migration procedure.
- Backup and restore runbook.
- Seed strategy separated into dev/demo/test.
- PII-sensitive audit and retention policy.
- Index review for dashboard/reporting workloads.

## 8. Auth and Authorization

The rewrite needs an explicit auth decision.

Options:

1. Keep Supabase Auth only for identity, but access data through Go API.
2. Move to enterprise OIDC/SSO if Telkom identity provider is available.
3. Use backend-managed email/password for early production, then add SSO.

Recommended direction: design the Go API around a generic authenticated principal, so identity provider can change without rewriting business authorization.

Roles to preserve from current implementation:

- guest
- talent
- pm
- manager
- chapter_lead
- hr
- executive
- admin

Authorization rules should live in backend `policy` code and be tested as a matrix. PostgreSQL RLS may mirror the most critical boundaries as defense-in-depth.

## 9. AI / Copilot Direction

Keep copilot behavior read-only for parity.

Production AI rules:

- AI never receives database credentials.
- AI tools run through backend services using the caller's authorization scope.
- Tool outputs are bounded, summarized, and logged with safe metadata.
- Provider keys only exist in backend/secret manager.
- Daily/user quotas are enforced server-side.
- The model should cite data periods/freshness where relevant.
- No write-capable AI actions until a separate approval workflow exists.

The current `tania-assistant` Edge Function can be used as a behavior reference, but the production rewrite should move AI orchestration into the Go backend or a dedicated Go service.

## 10. Components Needed / Decisions to Confirm

These are the components that need explicit product/engineering decisions before or during the rewrite:

| Component / Decision | Why it matters | Suggested default |
|---|---|---|
| Identity provider | Determines login, session, user lifecycle | Abstract now; support Supabase Auth or OIDC later |
| File storage | Needed for attachments, evidence, imports/exports | S3-compatible object storage/MinIO in dev |
| Email/notification channel | Needed for approval reminders and workflow alerts | Defer first; design notification interface |
| Background jobs | Needed for reminders, report generation, AI briefings, imports | Go worker + Postgres queue or simple cron first |
| Search | Needed for talent/staffing search if data grows | Start with Postgres full-text/trigram; add OpenSearch only if needed |
| Audit retention | Compliance/security decision | Keep immutable audit table with retention policy TBD |
| Reporting cache | Dashboards may get expensive | Start with SQL views; materialize only with evidence |
| AI provider | Current MVP supports Anthropic/MIDAS style | Backend provider abstraction with per-env config |
| Deployment target | Affects Docker, networking, secrets, backups | Containerized VPS/Kubernetes-ready structure |
| Design system | Svelte component consistency | Create shared component inventory before coding |
| Personal API tokens | Lets users control TANIA without opening the web UI | Jira-like PAT generated/revoked from TANIA settings |

## 11. Migration Strategy

Use a strangler-style rewrite, not a big-bang product redesign.

1. Freeze parity scope
   - Current modules and rules become the baseline.
   - Create feature parity matrix and acceptance criteria.

2. Design database v2
   - Map current Supabase schema to production PostgreSQL schema.
   - Preserve IDs where useful, but do not blindly copy MVP constraints if production needs better boundaries.

3. Build Go API foundation
   - Auth/session middleware.
   - Health check.
   - OpenAPI.
   - Database migrations.
   - Audit writer.
   - Authorization test matrix.

4. Build SvelteKit shell
   - Login/session flow.
   - App layout/navigation.
   - Role-aware menu UX.
   - Shared UI primitives.

5. Port modules by dependency order
   - Auth/Admin/Profile foundation
   - Talent Management/Profile
   - Timesheet
   - Workload
   - Feasibility
   - Budget
   - Dashboard
   - Copilot

6. Data migration and dual verification
   - Export current data.
   - Load into new schema.
   - Compare row counts and core reports.
   - Run parity checks per module.

7. Cutover
   - Read-only freeze window if needed.
   - Backup old database.
   - Import verified data.
   - Smoke test production.
   - Enable users.

## 12. Testing Strategy

Minimum production rewrite gates:

- Backend unit tests for domain and policy logic.
- Database migration test from empty database.
- Authorization matrix tests for every role/module.
- API integration tests with test Postgres.
- Frontend component tests for complex widgets.
- End-to-end smoke tests for critical workflows:
  - login
  - admin approves user
  - talent submits timesheet
  - manager approves/rejects
  - feasibility decision
  - budget entry
  - copilot read-only answer
- Import/export tests with real sample workbooks.

## 13. CI/CD Requirements

CI should run:

- Go format/test/vet
- SQL migration validation
- Svelte typecheck/lint/test
- OpenAPI generation drift check
- Docker build
- Secret scanning
- Dependency vulnerability scan

CD should be environment-based:

- dev/staging/prod separation
- database migration approval for prod
- rollback/runbook before production launch
- smoke tests after deployment

## 14. Open Questions

1. Should production auth integrate with Telkom SSO/OIDC from day one?
2. Where should attachments/evidence files live: Supabase Storage, S3-compatible object storage, or internal storage?
3. Is Vercel still desired for frontend, or should web/API/database deploy together as containers?
4. What is the required audit/data retention period?
5. Do AI requests/responses need redaction, approval, or retention controls?
6. Which reports must be exact at launch vs acceptable as later dashboards?
7. Is multi-chapter/multi-tenant support needed later, or only DPS?
8. What is the source of truth for HR/talent master data in production?

## 15. First Implementation Deliverables

Before coding the rewrite, create and approve:

- Feature parity matrix
- Current-role RBAC matrix
- Domain/data model v2
- API boundary and OpenAPI draft
- Component inventory
- Auth decision record
- Deployment decision record
- Data migration plan

This keeps the rewrite production-grade without accidentally changing the product scope.
