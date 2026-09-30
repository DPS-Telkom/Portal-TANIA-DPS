# TANIA API Access and Personal Access Tokens

Purpose: define how TANIA users can control TANIA through API endpoints without opening the TANIA web UI, using a Jira-like token flow generated from the TANIA UI.

This is a production rewrite requirement for the Svelte + Go + PostgreSQL architecture.

## 1. Product Intent

TANIA should support external access for each authenticated user:

1. User logs into TANIA web UI.
2. User opens an API access/settings page.
3. User creates a token with a name, scopes, and expiry.
4. TANIA shows the token once.
5. User copies the token into another client such as:
   - CLI tool
   - automation script
   - internal bot
   - workflow/integration service
   - personal dashboard
6. The external client calls TANIA API endpoints with that token.
7. TANIA executes requests as that user, with the same authorization boundaries as the web app.

This is similar to Jira API tokens: the token represents the user and is generated/revoked from the UI.

## 2. Core Rule

A token must never grant more access than the user already has in TANIA.

```text
API token access = user role + user scope + token scopes
```

Example:

- A `talent` user token still cannot read budget data.
- A `manager` user token can only approve timesheets that the manager could approve in the web app.
- An `admin` token can administer users only if the token includes the admin scope.
- A revoked/inactive user token stops working immediately.

## 3. User Experience

### 3.1 API Access Page

Add a user-facing page under account/settings:

```text
/settings/api-tokens
```

Page capabilities:

- List existing tokens without showing secret values.
- Create new token.
- Revoke token.
- Rename token.
- See token last-used time.
- See token expiry.
- See token scopes.
- See usage/audit events for that token if allowed.

### 3.2 Create Token Flow

Fields:

| Field | Required | Notes |
|---|---:|---|
| Token name | Yes | Human-readable, e.g. `Local CLI`, `Telegram Bot`, `Reporting Script` |
| Expiry | Yes | Default 30 or 90 days; max configurable |
| Scopes | Yes | Least privilege; see scopes below |
| Confirmation | Yes | User confirms token risk before generation |

After create:

- TANIA shows the raw token exactly once.
- User must copy it immediately.
- TANIA stores only a hash of the token.
- If lost, user must create a new token.

### 3.3 Token Display Example

```text
Your token was created.
Copy it now. You will not be able to see it again.

pat_tania_********************************
```

## 4. Token Format

Recommended token shape:

```text
pat_tania_<public_id>_<secret>
```

Where:

- `pat_tania` identifies token type.
- `public_id` helps lookup the token record quickly and safely.
- `secret` is a high-entropy random value.

Storage rule:

- Store `public_id` in plaintext.
- Store hash of `secret` only.
- Never store raw token.

Recommended hash:

- Argon2id or bcrypt for secret verification, or HMAC-SHA256 if lookup/performance requirements are strict and server secret is protected.

## 5. Authentication Header

External clients call TANIA API with Bearer auth:

```http
Authorization: Bearer pat_tania_<public_id>_<secret>
```

Example:

```bash
curl https://tania.example.com/api/v1/me \
  -H "Authorization: Bearer pat_tania_xxx_yyy"
```

The API should also support normal web sessions separately. PAT auth is for non-browser clients.

## 6. API Scopes

Scopes limit what a token can do. User role still applies after scope checks.

Recommended initial scopes:

| Scope | Meaning |
|---|---|
| `profile:read` | Read own profile and allowed profile data |
| `profile:write` | Update allowed own profile fields |
| `talent:read` | Read allowed talent data |
| `talent:write` | Write allowed talent/development/evidence data |
| `timesheet:read` | Read allowed timesheet data |
| `timesheet:write` | Create/update/submit own timesheets where allowed |
| `timesheet:approve` | Approve/reject timesheets where role allows |
| `workload:read` | Read allowed workload/utilization/allocation summaries |
| `workload:write` | Write allocations where role allows |
| `feasibility:read` | Read feasibility cases |
| `feasibility:write` | Submit/edit feasibility cases where role allows |
| `feasibility:decide` | Decide feasibility cases where role allows |
| `budget:read` | Read budget data where role allows |
| `budget:write` | Create/update budget entries/lines where role allows |
| `copilot:read` | Use read-only copilot endpoints |
| `admin:users` | Manage users/roles where role allows |
| `audit:read` | Read audit logs where role allows |

For first implementation, prefer fewer broad scopes if complexity is too high:

```text
read
write
approve
admin
copilot
```

Then split into module-level scopes later.

## 7. Endpoint Model

Production API should expose stable endpoints under versioned paths:

```text
/api/v1/me
/api/v1/profiles
/api/v1/talent
/api/v1/timesheets
/api/v1/workload
/api/v1/feasibility
/api/v1/budget
/api/v1/copilot
/api/v1/admin
/api/v1/audit
```

PAT-protected endpoints use the same backend policy layer as web requests.

## 8. Example API Usage

### 8.1 Read Current User

```bash
curl https://tania.example.com/api/v1/me \
  -H "Authorization: Bearer $TANIA_TOKEN"
```

### 8.2 Submit Timesheet

```bash
curl -X POST https://tania.example.com/api/v1/timesheets/weeks/2026-09-28/submit \
  -H "Authorization: Bearer $TANIA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entries": [
      {
        "project_id": "...",
        "activity_code": "DEL",
        "work_date": "2026-09-28",
        "hours": 8,
        "note": "Delivery work"
      }
    ]
  }'
```

Required checks:

- Token has `timesheet:write`.
- Token owner is active and non-guest.
- User can submit only own rows.
- State transition is valid.
- Audit event is written.

### 8.3 Approve Timesheet

```bash
curl -X POST https://tania.example.com/api/v1/timesheets/{timesheet_id}/approve \
  -H "Authorization: Bearer $TANIA_TOKEN"
```

Required checks:

- Token has `timesheet:approve`.
- User role/scope permits reviewing that timesheet.
- User is not approving their own timesheet.
- Timesheet is currently submitted.
- Audit event is written.

### 8.4 Ask Copilot

```bash
curl -X POST https://tania.example.com/api/v1/copilot/chat \
  -H "Authorization: Bearer $TANIA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Siapa yang overload minggu ini?"
  }'
```

Required checks:

- Token has `copilot:read`.
- Copilot tools can only read data visible to the token owner.
- Quotas and rate limits apply.
- AI remains read-only.

## 9. Security Requirements

### 9.1 Token Storage

Database table should store:

- token id
- user id
- token name
- public id
- secret hash
- scopes
- created at
- expires at
- last used at
- revoked at
- created ip/user agent if needed
- last used ip/user agent if needed

Never store the raw token.

### 9.2 Revocation

Revocation must be immediate.

Revoked tokens:

- Cannot authenticate.
- Remain visible in audit/history as revoked.
- Should not be physically deleted by default.

### 9.3 Expiry

Tokens must expire.

Recommended defaults:

- Default expiry: 90 days.
- Max expiry: 365 days, configurable.
- Optional no-expiry tokens should be disabled by default.

### 9.4 Rate Limits

Apply rate limits per token and per user:

- General API requests.
- Write requests.
- Copilot/AI requests.
- Import/export endpoints.

### 9.5 Audit

Every token write action must be audited:

- actor user id
- token id/public id
- endpoint/action
- resource id if applicable
- success/failure
- timestamp
- request id

Sensitive data must not be logged:

- raw token
- access token secret
- passwords
- AI provider keys

### 9.6 Token Leak Handling

If token leak is suspected:

1. User/admin revokes token.
2. Audit usage history is reviewed.
3. User rotates affected integrations.
4. Security event is recorded if needed.

## 10. Admin Controls

Admins should be able to:

- View token metadata by user.
- Revoke any token.
- Disable PAT feature globally.
- Set max expiry.
- Set allowed scopes.
- Set rate limits.
- Require token rotation.

Admins should not be able to view raw token secrets.

## 11. Database Draft

Example table shape:

```sql
create table api_tokens (
  id uuid primary key,
  user_id uuid not null references profiles(id),
  name text not null,
  public_id text not null unique,
  secret_hash text not null,
  scopes text[] not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_ip inet,
  last_used_ip inet,
  user_agent text
);
```

Indexes:

```sql
create index api_tokens_user_id_idx on api_tokens(user_id);
create index api_tokens_public_id_idx on api_tokens(public_id);
create index api_tokens_active_idx on api_tokens(user_id, expires_at)
  where revoked_at is null;
```

## 12. Backend Implementation Notes

Recommended Go middleware:

```text
Authenticate request
  ├── If web session exists: principal from session
  └── Else if Bearer PAT exists: principal from token
        ├── parse token type/public_id/secret
        ├── lookup token by public_id
        ├── verify secret hash
        ├── reject expired/revoked token
        ├── reject inactive/guest user where endpoint requires member
        ├── attach token scopes to request context
        └── update last_used_at asynchronously or throttled
```

Policy check order:

1. User is authenticated.
2. User is active.
3. Token is valid if PAT auth is used.
4. Token has required scope.
5. User role/resource policy allows action.
6. Business workflow state allows action.

## 13. Frontend Implementation Notes

SvelteKit API token page should include:

- Token list table.
- Create token dialog.
- Scope selector with plain-language descriptions.
- Expiry selector.
- One-time token reveal screen.
- Copy button.
- Revoke confirmation.
- Last-used metadata.

UX copy should be explicit:

```text
Token ini bisa mengakses TANIA sebagai Anda. Jangan dibagikan. Jika bocor, segera revoke token ini.
```

## 14. CLI / Integration Future

Once PAT auth exists, TANIA can support:

- `tania` CLI
- Telegram/Teams bot controlled per user token
- Scheduled scripts for timesheet reminders/submission helpers
- Reporting scripts
- Jira-like external integrations
- Internal automation without browser login

Any integration that performs writes must still show clear action intent and rely on backend policy/audit.

## 15. Open Decisions

1. What is the default token expiry: 30, 90, or 180 days?
2. Should admin approval be required before users can create tokens?
3. Should `guest` users be allowed to create tokens? Recommended: no.
4. Should tokens be allowed for AI/copilot endpoints by default?
5. Should write scopes require shorter expiry than read-only scopes?
6. Do we need IP allowlist per token?
7. Should the first version use broad scopes or module-specific scopes?
8. Should production support OAuth2 client credentials later for service-to-service integrations?
