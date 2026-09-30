# TANIA Production Architecture

This document describes the proposed production target architecture for rewriting TANIA as a monorepo with Svelte frontend, Go backend, and PostgreSQL database.

## 1. Architecture Goals

- Preserve all current TANIA business features first.
- Move from MVP/static Supabase access to a production application boundary.
- Make authorization testable and enforceable in the backend.
- Keep PostgreSQL as the source of truth.
- Make deployment, backups, observability, and CI/CD production-ready.
- Keep AI read-only and scoped to the caller's access.

## 2. High-Level View

```text
+---------------------+
| Browser             |
| SvelteKit UI        |
+----------+----------+
           |
           | HTTPS / JSON API
           v
+---------------------+
| Go API Service      |
| - Auth/session      |
| - Policy/RBAC       |
| - Domain services   |
| - Audit logging     |
| - AI tools          |
| - Import/export     |
+----+-----------+----+
     |           |
     | SQL       | Optional job enqueue
     v           v
+----------+   +----------------+
|PostgreSQL|   | Go Worker      |
+----------+   | - reminders    |
               | - reports      |
               | - imports      |
               | - AI briefings |
               +----------------+

Optional external services:
- Object storage for evidence/import/export files
- AI provider / MIDAS / Anthropic-compatible gateway
- Email or collaboration notification provider
- Observability stack
```

## 3. Monorepo Boundaries

```text
apps/web
```

SvelteKit frontend. Owns routes, UI, client-side state, and UX validation. It does not own business authorization.

```text
services/api
```

Go HTTP API. Owns auth, policy, workflows, validation, audit, database writes, AI tool execution, imports, exports, and OpenAPI contract.

```text
services/worker
```

Optional Go worker. Owns scheduled/asynchronous work after the API foundation exists.

```text
db
```

PostgreSQL migrations, seeds, fixtures, and schema documentation.

```text
packages/api-client
```

Generated TypeScript API client from OpenAPI. Introduce when backend API starts stabilizing.

```text
packages/ui
```

Shared Svelte UI components. Introduce when repeated components justify extraction.

## 4. Request Flow

### Read Example: Dashboard KPIs

1. User opens dashboard in SvelteKit.
2. Web app calls `GET /dashboard/summary`.
3. Go API reads session and resolves principal.
4. Policy layer calculates allowed scope.
5. Domain service queries PostgreSQL views/tables.
6. API returns role-scoped summaries.
7. UI renders cards/alerts.

### Write Example: Timesheet Submit

1. Talent edits weekly timesheet grid.
2. Web app calls `POST /timesheets/weeks/{week_start}/submit`.
3. API validates input and current state.
4. Policy confirms the actor may submit those rows.
5. Service updates rows in a transaction.
6. Audit event is written in the same transaction.
7. Response returns updated state.

### AI Example: Copilot Question

1. User sends a question to copilot panel.
2. Web app calls `POST /copilot/chat`.
3. API checks quota and membership.
4. AI orchestration chooses read-only tools.
5. Each tool calls normal domain services under caller scope.
6. Tool output is bounded and passed to model.
7. Response is saved to chat history and returned.

## 5. Authorization Model

The production rewrite should treat authorization as code plus tests.

Core concepts:

- Principal: authenticated user identity and role.
- Scope: which people/projects/budget/talent data the principal can access.
- Action: read, create, update, submit, approve, decide, administer.
- Resource: module entity such as profile, timesheet, budget entry, feasibility case.

Recommended package:

```text
services/api/internal/policy
```

Example policy functions:

- `CanViewProfile(actor, profile)`
- `CanEditProfile(actor, profile, fields)`
- `CanSubmitTimesheet(actor, row)`
- `CanApproveTimesheet(actor, row)`
- `CanReadBudget(actor)`
- `CanDecideFeasibility(actor, case)`
- `CanRunCopilotTool(actor, tool)`

Every policy should have matrix tests for allowed and denied cases.

## 6. Database Architecture

PostgreSQL should enforce data integrity even when bugs exist in application code.

Use database constraints for:

- Required fields
- Foreign keys
- Unique keys
- Valid status values
- Non-negative hours/amounts
- Period/month shape where applicable
- Immutable or generated fields when stable

Use backend services for:

- Workflow transitions
- Authorization
- User-facing validation messages
- Audit event composition
- AI/data access rules

Use views/materialized views for:

- Utilization summaries
- Budget summaries
- Dashboard aggregates
- Compliance reports

RLS decision:

- Option A: no RLS, Go API is the only database user and policy boundary.
- Option B: keep limited RLS/DB guards for high-risk tables as defense-in-depth.

Recommended default: start with Go policy as the primary boundary, then add DB-level defense for high-risk data once access patterns stabilize.

## 7. API Architecture

API style: REST JSON with OpenAPI.

Initial route groups:

```text
/auth
/me
/admin/users
/talent
/talent-profiles
/workload
/timesheets
/feasibility
/budget
/dashboard
/copilot
/audit
/settings
/files
```

API requirements:

- Consistent error shape.
- Request IDs in logs and responses.
- Pagination on lists.
- Server-side validation.
- Idempotency where duplicate submissions are risky.
- OpenAPI schema checked in CI.

Example error shape:

```json
{
  "error": {
    "code": "TIMESHEET_ALREADY_APPROVED",
    "message": "Timesheet yang sudah approved tidak bisa diedit.",
    "fields": []
  },
  "request_id": "..."
}
```

## 8. Deployment Architecture

Minimum production-friendly deployment:

```text
reverse proxy
  ├── apps/web container
  └── services/api container
services/worker container
postgres database
object storage
backup job
```

Environment separation:

- local
- staging
- production

Each environment needs separate:

- database
- secrets
- AI provider config
- object storage bucket
- domain/origin allowlist

## 9. Observability

API and worker must expose enough visibility for production support:

- Structured logs with request ID, actor ID, route, status, latency.
- Metrics for request count, latency, errors, DB pool, job failures.
- Audit logs for business/security events.
- AI usage metrics: requests, tokens if available, cost bucket, quota denials.
- Import/export metrics: row counts, validation failures, duration.

Do not log secrets, raw access tokens, or sensitive AI prompts beyond approved retention policy.

## 10. Security Baseline

- No service-role equivalent in frontend.
- No database credentials in frontend.
- Secrets only from environment/secret manager.
- CSRF/session strategy decided before implementation.
- CORS allowlist per environment.
- Password/OIDC/session handling reviewed before launch.
- File upload validation: type, size, malware scanning if required.
- Rate limit auth, copilot, import, and expensive report endpoints.
- Audit admin/security-sensitive changes.

## 11. Data Migration Architecture

Data migration should be repeatable.

Pipeline:

1. Extract current Supabase/PostgreSQL data.
2. Transform into production schema.
3. Load into staging.
4. Compare counts and key reports.
5. Run parity smoke tests.
6. Repeat until clean.
7. Execute production cutover with backup and rollback plan.

Artifacts to create later:

- `docs/DATA_MIGRATION_PLAN.md`
- migration scripts under `tooling/scripts/migration/`
- staging verification SQL
- cutover checklist

## 12. Production Readiness Checklist

Before replacing the current app:

- [ ] Feature parity matrix completed and approved.
- [ ] Auth decision approved.
- [ ] API policy matrix tests pass.
- [ ] Database migrations run from empty DB.
- [ ] Backup and restore tested.
- [ ] CI green for web/api/db.
- [ ] Staging smoke tests pass.
- [ ] Data migration verified.
- [ ] Copilot quotas and provider secrets configured.
- [ ] Observability dashboards/log access ready.
- [ ] Cutover and rollback plan approved.
