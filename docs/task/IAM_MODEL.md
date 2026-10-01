# TANIA Identity and Access Management (IAM) Model

Purpose: define the IAM layer required for the TANIA production rewrite.

RBAC answers: **what is this user allowed to do?**

IAM answers: **who is this user, how do they authenticate, how are roles granted, and how is access revoked?**

Because TANIA will support RBAC and Personal Access Tokens (PAT), IAM is a required production component.

## 1. IAM Scope

TANIA IAM must cover:

- User identity
- Authentication
- Session management
- Role assignment
- Account lifecycle
- Personal Access Tokens
- Service/integration identity, if needed later
- Audit of security-sensitive changes
- Admin controls

IAM is not just login. It is the control plane for who can access TANIA and how that access changes over time.

## 2. Core Concepts

| Concept | Meaning |
|---|---|
| Identity | The person or system account known to TANIA |
| Principal | The authenticated actor for a request |
| Role | Coarse-grained permission group such as `talent`, `manager`, `admin` |
| Scope | Token/API permission boundary such as `timesheet:write` |
| Policy | Runtime decision combining identity, role, scope, resource, and workflow state |
| Session | Browser-authenticated user context |
| PAT | User-generated API token representing the user outside the web UI |
| Service account | Non-human identity for system-to-system automation, if approved later |

## 3. Identity Sources

Production rewrite should support a generic identity model so TANIA is not locked to one provider.

Potential identity providers:

1. TANIA-managed email/password
2. Supabase Auth as identity provider only
3. Telkom SSO/OIDC
4. Other enterprise identity provider later

Recommended design:

- Internally use a stable `user_id` / `profile_id`.
- Store provider identifiers separately.
- Keep business authorization independent from the identity provider.

Example identity mapping:

```text
identity_provider = "local" | "supabase" | "oidc"
provider_subject = external provider user id
profile_id = TANIA internal user id
```

## 4. User Lifecycle

### 4.1 Registration / Provisioning

Current TANIA behavior:

- New users register openly.
- New users become `guest`.
- Guest users wait on `/menunggu-akses`.
- Admin grants a real role before module access is available.

Production rewrite should preserve this unless product decides otherwise.

Flow:

```text
User signs up / is provisioned
  -> profile created
  -> role = guest
  -> is_active = true
  -> no module data access
  -> admin assigns role/manager/squad/etc
  -> user becomes active member
```

### 4.2 Activation and Deactivation

Rules:

- `is_active = false` means no application access.
- Deactivation invalidates active sessions on next request or immediately if session store supports revocation.
- Deactivation invalidates PAT access immediately.
- Deactivated users remain in history/audit; do not hard-delete by default.

### 4.3 Role Changes

Rules:

- Only admin can change role.
- Admin cannot demote/deactivate themselves if it would risk lockout.
- Role change affects sessions and PATs on the next request because role is resolved from the database.
- Role changes must be audited.

### 4.4 Manager / Reporting Line Changes

Rules:

- Only admin can change `manager_id` unless a future delegated HR/admin workflow is approved.
- Reporting-line changes immediately affect scoped access such as timesheet approval and talent visibility.
- Reporting-line changes must be audited.

## 5. Authentication Methods

TANIA should support at least two authentication paths:

| Method | Used by | Notes |
|---|---|---|
| Web session | Browser users | SvelteKit + Go API session/JWT validation |
| Personal Access Token | CLI/scripts/bots/integrations | Jira-like token generated from TANIA UI |

Potential later method:

| Method | Used by | Notes |
|---|---|---|
| Service account/OAuth2 client credentials | System-to-system integrations | Not a first-version requirement unless needed |

## 6. Session Management

Session requirements:

- Secure cookie or token-based session design approved before implementation.
- Session tied to user identity.
- Session checks current user state on requests.
- Deactivated users are denied.
- Guest users can access only guest-safe pages.
- Admin/security actions require fresh session or re-auth if needed.

Minimum web session claims/context:

- user id
- email
- role, loaded fresh or cache-bounded
- active status
- request id

Do not trust client-stored role for authorization.

## 7. PAT and IAM Relationship

PATs are part of IAM.

A PAT represents a user identity outside the browser. It must not grant more access than the user has.

Effective access:

```text
effective_access = active_user AND valid_token AND token_scope AND RBAC_policy AND resource_policy AND workflow_state
```

PAT request evaluation order:

1. Parse token.
2. Verify token hash.
3. Reject revoked/expired token.
4. Load token owner.
5. Reject inactive user.
6. Reject guest user for member-only APIs.
7. Check token scope.
8. Check RBAC/resource policy.
9. Check workflow/business state.
10. Audit sensitive action.

## 8. RBAC Relationship

IAM owns assignment and lifecycle of roles. RBAC owns permission semantics.

Examples:

| IAM action | RBAC effect |
|---|---|
| Admin changes user from `manager` to `talent` | User loses manager approval/reporting access |
| Admin deactivates user | User loses all access, including PAT |
| Admin changes manager relationship | Direct-report scoped access changes |
| User creates PAT with `timesheet:write` | Token can write only what user role/resource policy permits |

## 9. Admin IAM Capabilities

Admin UI should support:

- View users.
- Approve guest users.
- Assign role.
- Assign manager.
- Activate/deactivate user.
- View user token metadata.
- Revoke user PATs.
- View IAM audit history.
- Configure PAT max expiry/rules if needed.

Admin UI must not support:

- Viewing raw PAT secrets.
- Editing audit records.
- Silently impersonating a user.

If impersonation/support login is ever needed, it must be a separate audited feature with explicit product/security approval.

## 10. Service Accounts

Service accounts are not required for the first rewrite unless a true system-to-system integration appears.

If added later, they must be separate from PATs:

| PAT | Service Account |
|---|---|
| Represents a human user | Represents a system/integration |
| Created by user/admin | Created by admin/security process |
| Bound by user RBAC | Bound by service-specific permissions |
| Used for personal automation | Used for backend integrations |

Do not use a human admin PAT as a production service credential.

## 11. Audit Requirements

IAM events to audit:

- User registered/provisioned.
- Guest approved.
- Role changed.
- Manager changed.
- User activated/deactivated.
- PAT created.
- PAT revoked.
- PAT expired/auth failed if security policy requires.
- Admin changed IAM settings.
- Failed login bursts/rate-limit events if available.

Audit record should include:

- actor user id
- target user id
- action
- old value / new value for safe fields
- timestamp
- request id
- IP/user-agent when useful

Never audit raw secrets, passwords, or raw PAT values.

## 12. Security Controls

Minimum controls:

- Strong password or SSO policy depending identity provider.
- Rate limit login and PAT-auth endpoints.
- Revoke sessions/PATs on deactivation.
- Store only password hashes/token hashes.
- Use secure cookies if browser sessions use cookies.
- Use CSRF protection if cookie-authenticated browser writes are used.
- Require re-authentication for high-risk IAM actions if needed.
- Prevent last-admin lockout.
- Admin actions are auditable.

## 13. Database Draft

### 13.1 Profiles / Users

Current `profiles` table can remain the business-user table. Production rewrite may split auth identity from profile if needed.

Possible split:

```text
identities
  id
  provider
  provider_subject
  email
  created_at
  last_login_at

profiles
  id
  identity_id
  full_name
  role
  manager_id
  is_active
  business attributes...
```

If simplicity is preferred, keep one `profiles` table but still separate provider identifiers from business fields.

### 13.2 IAM Audit

Can use the global audit log with IAM event types, or a dedicated `iam_audit_events` table if security reporting needs separation.

## 14. Production Decisions Needed

1. Will TANIA use Telkom SSO/OIDC for production?
2. If SSO is used, is self-registration still allowed?
3. Should guest approval remain manual admin approval?
4. Should HR be allowed to approve users or only admin?
5. Should role assignment be admin-only or configurable?
6. What is the max PAT expiry?
7. Should PAT creation be available to all active users or only approved roles?
8. Are service accounts needed in Release 1?
9. Is support impersonation required? Recommended default: no.
10. What audit retention period is required?

## 15. Implementation Guidance

Build IAM before porting business modules.

Recommended sequence:

1. Profile/user schema.
2. Login/session foundation.
3. Guest waiting flow.
4. Admin approval and role assignment.
5. Policy context loading.
6. PAT create/list/revoke.
7. IAM audit events.
8. RBAC matrix tests.
9. First protected module endpoint.

This ensures every module ported afterward uses the same identity and policy foundation.
