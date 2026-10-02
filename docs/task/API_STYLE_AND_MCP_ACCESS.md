# TANIA API Style and MCP Access Recommendation

Purpose: recommend the API style for TANIA production rewrite, especially for large user volume and future control through a bot/MCP server in a separate repository.

## 1. Short Recommendation

Use a hybrid API strategy:

1. **REST + OpenAPI** for normal web/frontend resource APIs.
2. **JSON-RPC** for bot/MCP command-style actions.
3. **No raw query exposure** to frontend, bot, MCP, or third-party clients.
4. **Raw SQL/query builders stay internal** inside the Go backend repository layer.

JSON-RPC is useful for command dispatch, but it is not automatically faster than REST. Performance will mostly come from:

- database schema and indexes
- query design
- pagination/cursors
- caching where appropriate
- connection pooling
- payload size control
- async jobs for heavy work
- rate limiting and backpressure

## 2. Why Not Expose Raw Query?

Do not expose raw SQL or raw query access to users, bots, or MCP.

Risks:

- Data leakage across RBAC boundaries.
- SQL injection / query abuse.
- Expensive unbounded queries.
- Hard-to-audit access paths.
- Business workflow bypass.
- No stable API contract.
- Difficult versioning.

TANIA has RBAC, IAM, PAT scopes, audit, workflow states, and module policies. Raw query access bypasses too much of that unless every query is rewritten into a safe domain function anyway.

Rule:

```text
Clients call domain APIs.
Domain APIs call policy checks.
Policy-approved services call repository queries.
Repository queries call PostgreSQL.
```

## 3. REST vs JSON-RPC

### 3.1 REST Strengths

Use REST when the API maps to resources and standard operations.

Examples:

```text
GET    /api/v1/me
GET    /api/v1/timesheets?week=2026-09-28
POST   /api/v1/timesheets/weeks/2026-09-28/submit
GET    /api/v1/budget/summary?year=2026
POST   /api/v1/feasibility/cases
```

Strengths:

- Easy to document with OpenAPI.
- Easy for frontend teams.
- Easy to cache/read/debug.
- Good HTTP semantics.
- Good fit for generated TypeScript clients.
- Familiar for external integrations.

### 3.2 JSON-RPC Strengths

Use JSON-RPC when the API is action/tool oriented.

Examples:

```text
POST /api/rpc
method: timesheet.submitWeek
method: timesheet.approve
method: copilot.ask
method: talent.searchCandidates
method: budget.createEntry
method: admin.revokeToken
```

Strengths:

- Good fit for bot/MCP tools.
- One endpoint can dispatch many typed methods.
- Request/response shape is predictable.
- Easy to add tool-like methods without inventing many custom URLs.
- Batch calls are possible if explicitly allowed.

### 3.3 Performance Reality

JSON-RPC is not inherently faster than REST.

Both are usually:

```text
HTTP + JSON + Go handler + DB query
```

The expensive parts are normally:

- DB reads/writes
- joins and aggregation
- missing indexes
- large payloads
- AI calls
- file/import/export work
- network latency

JSON-RPC can feel faster for bot/MCP because dispatch is simple and tool calls are compact, but the backend still needs the same policy and DB work.

## 4. Recommended API Layers

```text
SvelteKit Web App
  -> REST/OpenAPI API
      -> Go service/policy/repository
          -> PostgreSQL

MCP Server / Bot Repo
  -> JSON-RPC tool endpoint or REST endpoint
      -> Go service/policy/repository
          -> PostgreSQL
```

The key is that both REST and JSON-RPC call the same backend service layer.

Do not duplicate business logic between REST handlers and JSON-RPC handlers.

## 5. Proposed API Surface

### 5.1 REST API for Web and Standard Integrations

```text
/api/v1/auth/*
/api/v1/me
/api/v1/profiles
/api/v1/talent
/api/v1/talent-profiles
/api/v1/timesheets
/api/v1/workload
/api/v1/feasibility
/api/v1/budget
/api/v1/dashboard
/api/v1/copilot
/api/v1/admin
/api/v1/audit
/api/v1/files
/api/v1/settings
```

Use OpenAPI for:

- generated TypeScript client
- request/response schemas
- API docs
- CI contract validation

### 5.2 JSON-RPC API for Bot/MCP Actions

Endpoint:

```text
POST /api/v1/rpc
```

Example request:

```json
{
  "jsonrpc": "2.0",
  "id": "req-123",
  "method": "timesheet.submitWeek",
  "params": {
    "week_start": "2026-09-28",
    "entries": [
      {
        "project_id": "...",
        "activity_code": "DEL",
        "work_date": "2026-09-28",
        "hours": 8,
        "note": "Delivery work"
      }
    ]
  }
}
```

Example response:

```json
{
  "jsonrpc": "2.0",
  "id": "req-123",
  "result": {
    "status": "submitted",
    "week_start": "2026-09-28"
  }
}
```

Example error:

```json
{
  "jsonrpc": "2.0",
  "id": "req-123",
  "error": {
    "code": -32003,
    "message": "Forbidden",
    "data": {
      "reason": "timesheet:approve scope required"
    }
  }
}
```

## 6. JSON-RPC Method Naming

Recommended naming:

```text
<domain>.<action>
```

Examples:

| Domain | Methods |
|---|---|
| `me` | `me.get`, `me.getPermissions` |
| `timesheet` | `timesheet.getWeek`, `timesheet.saveDraft`, `timesheet.submitWeek`, `timesheet.approve`, `timesheet.reject` |
| `talent` | `talent.search`, `talent.getProfile`, `talent.searchCandidates` |
| `workload` | `workload.getUtilization`, `workload.getHeatmap` |
| `feasibility` | `feasibility.createCase`, `feasibility.scoreCase`, `feasibility.decide` |
| `budget` | `budget.getSummary`, `budget.createEntry` |
| `copilot` | `copilot.ask`, `copilot.getBriefing` |
| `admin` | `admin.approveUser`, `admin.assignRole`, `admin.revokeToken` |

## 7. Auth for JSON-RPC / MCP

The MCP server or bot should authenticate to TANIA using the user's PAT, unless a service-account model is approved later.

Recommended flow:

```text
User creates PAT in TANIA UI
  -> User configures PAT in MCP/bot
  -> MCP/bot calls TANIA JSON-RPC with Bearer PAT
  -> TANIA resolves user + token scopes + RBAC
  -> TANIA executes allowed action
```

Header:

```http
Authorization: Bearer pat_tania_<public_id>_<secret>
```

Access rule:

```text
effective access = active user + valid PAT + PAT scope + RBAC + resource policy + workflow state
```

## 8. MCP Integration Pattern

The MCP repo should not connect to TANIA database.

MCP should act as a client of TANIA API:

```text
MCP Tool Call
  -> TANIA JSON-RPC/REST API
      -> IAM/PAT verification
      -> RBAC/policy check
      -> domain service
      -> PostgreSQL
```

MCP tool examples:

| MCP tool | TANIA RPC method |
|---|---|
| `submit_timesheet` | `timesheet.submitWeek` |
| `approve_timesheet` | `timesheet.approve` |
| `search_talent` | `talent.searchCandidates` |
| `ask_tania` | `copilot.ask` |
| `create_budget_entry` | `budget.createEntry` |
| `get_workload_heatmap` | `workload.getHeatmap` |

MCP should not implement TANIA business logic. It should only validate basic input shape and call TANIA.

## 9. Large User Volume Considerations

For many users, API style is less important than backend design.

Must-have controls:

- Cursor pagination for large lists.
- Query indexes for common filters.
- Request timeouts.
- DB connection pool limits.
- Rate limits per user/token/IP.
- Async jobs for imports/exports/report generation.
- Caching for expensive read-only summaries where safe.
- Bounded response payloads.
- Backpressure for AI/copilot endpoints.
- Audit writes that do not block too long; use transaction when required for sensitive writes.

## 10. Batch Calls

JSON-RPC supports batch requests, but enable carefully.

Recommendation:

- Allow batch only for read-only methods at first.
- Limit batch size.
- Deny batch for sensitive writes unless there is a clear use case.
- Audit each write action separately.

Example limits:

```text
max_batch_size = 10
write_batch_enabled = false initially
read_timeout = 10s
write_timeout = 15s
ai_timeout = longer but explicit
```

## 11. Error Model

Keep consistent error codes across REST and JSON-RPC.

Internal/domain error examples:

| Error | Meaning |
|---|---|
| `UNAUTHENTICATED` | No valid session/PAT |
| `FORBIDDEN` | RBAC/scope/resource policy denied |
| `VALIDATION_FAILED` | Input invalid |
| `CONFLICT` | Workflow/state conflict |
| `NOT_FOUND` | Resource not found or not visible |
| `RATE_LIMITED` | Too many requests |
| `INTERNAL` | Server error |

JSON-RPC can map these into `error.code` + `error.data.code`.

## 12. Versioning

REST:

```text
/api/v1/...
```

JSON-RPC:

```text
/api/v1/rpc
```

Method versioning options:

- Prefer stable method contracts.
- Add new method names for breaking behavior, e.g. `timesheet.submitWeekV2`, only when unavoidable.
- Deprecate methods with documented timelines.

## 13. What Not To Do

Do not:

- Let MCP or frontend send raw SQL.
- Let MCP connect to PostgreSQL.
- Put role decisions in MCP.
- Trust PAT scopes without checking RBAC.
- Build separate business logic paths for REST and JSON-RPC.
- Expose generic `query(table, filter)` APIs.
- Allow unbounded list endpoints.
- Allow batch write calls before audit/rate-limit behavior is designed.

## 14. Final Recommendation

Use:

```text
REST/OpenAPI for web + normal integrations.
JSON-RPC for bot/MCP action calls.
Internal repository queries for PostgreSQL.
No raw query exposure.
```

This gives TANIA:

- strong frontend contract
- clean MCP/tool mapping
- safer RBAC/IAM enforcement
- better auditability
- room to scale without exposing database internals
