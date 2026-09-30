# TANIA Feature Parity Matrix

Purpose: track the production rewrite so the Svelte + Go + PostgreSQL version keeps the existing feature set before adding new scope.

Legend:

- Must: required for first production parity
- Should: important, can ship shortly after only if approved
- Later: explicitly not part of first parity

## 1. Cross-Cutting Capabilities

| Area | Capability | Priority | Rewrite note |
|---|---|---:|---|
| Auth | Login/logout/session | Must | Backend-owned session; identity provider TBD |
| Auth | Open registration with guest/no-access state | Must | Preserve guest waiting flow unless product changes it |
| Authorization | Role-based access | Must | Enforce in Go policy layer; mirror critical rules in DB if useful |
| Authorization | Roles: guest, talent, pm, manager, chapter_lead, hr, executive, admin | Must | Keep all current roles |
| Audit | Audit trail for sensitive changes | Must | Server-side immutable audit writer |
| Export | Excel exports | Must | Generate server-side |
| Import | Excel/workbook import and validation | Must | Validate server-side; show row-level errors |
| UI | Bahasa Indonesia product UI | Must | Keep existing language style |
| UX | Role-aware navigation | Must | Menu visibility is UX only; backend still enforces |
| Observability | Logs/metrics/traces | Must | New production requirement |
| Backups | Database backup/restore runbook | Must | New production requirement |

## 2. Talent Management

| Capability | Priority | Notes |
|---|---:|---|
| Talent directory | Must | Filter/search/paginate |
| Talent profiles | Must | Identity, squad, grade, location, manager |
| Competency matrix | Must | Skills with level/certification |
| Staffing candidate search | Must | Skill, min level, availability/capacity |
| Talent import/export | Must | Keep current workbook behavior and improve validation |
| Manager/admin edit permissions | Must | Policy-tested |

## 3. Talent Profile

| Capability | Priority | Notes |
|---|---:|---|
| 360 talent profile | Must | Keep identity/current position/capability sections |
| Career/talent journey | Must | Journey/history views |
| Certifications | Must | Status, expiry if present in model |
| Project experience | Must | Evidence-backed where possible |
| Performance history | Must | Preserve current PRD scope |
| Competency gap | Must | Server-side calculation where business rules are stable |
| Development plan | Must | Plan/activity tracking |
| AI talent recommendation | Must | Read-only; backend-mediated |
| Evidence files | Should | Depends on storage decision |

## 4. Workload Analysis

| Capability | Priority | Notes |
|---|---:|---|
| Allocation data | Must | Planned allocation per person/project/month |
| Actual utilization | Must | Approved timesheet-based |
| Capacity calculation | Must | Start with existing rule: 8h x weekdays minus leave |
| Heatmap | Must | Frontend visualization from API summaries |
| Overload/underload alerts | Must | Thresholds configurable |
| Squad/person drilldown | Must | Role-scoped |

## 5. Project Timesheet

| Capability | Priority | Notes |
|---|---:|---|
| Weekly entry grid | Must | Preserve current workflow |
| Draft/submitted/approved/rejected states | Must | State transitions enforced server-side |
| Manager approval | Must | Manager-of-row or elevated roles |
| Compliance report | Must | Weekly submission compliance |
| Rejection reason | Must | Audit-visible |
| Leave/training/internal activities | Must | Preserve activity categories |

## 6. Project Feasibility

| Capability | Priority | Notes |
|---|---:|---|
| Case intake | Must | Candidate project data |
| Weighted scoring | Must | Preserve current dimensions/weights until product changes them |
| Resource check | Must | Required skills/headcount vs staffing availability |
| Decision: go/no-go/hold | Must | Requires rationale; audit trail |
| Decision history | Must | Audit backed |
| Links to budget | Must | Only allowed cases as current rules define |

## 7. Budget Control

| Capability | Priority | Notes |
|---|---:|---|
| Budget lines/plans | Must | Fiscal year/program/category |
| Commitment entries | Must | Server-side validation |
| Realization entries | Must | Server-side validation |
| Budget summary | Must | Plan vs committed vs realized vs remaining |
| Burn/threshold alerts | Must | Role-scoped visibility |
| Talent role no-access rule | Must | Preserve current restriction unless product changes it |

## 8. Dashboard / Beranda

| Capability | Priority | Notes |
|---|---:|---|
| Role-based KPI cards | Must | API summaries by role |
| Daily focus/briefing area | Must | Can be static summaries before AI is complete |
| Navigation to modules | Must | SvelteKit route layout |
| Responsive layout | Must | Desktop and mobile |

## 9. Admin

| Capability | Priority | Notes |
|---|---:|---|
| User approval from guest | Must | Preserve waiting-access flow |
| Role assignment | Must | Admin only |
| Activate/deactivate user | Must | Inactive = no access |
| Manager relationship management | Must | Guard against privilege escalation |
| Master data maintenance | Should | Skills, activities, settings |
| Audit viewing | Must | Chapter lead/admin as policy allows |

## 10. Avatar / Copilot AI

| Capability | Priority | Notes |
|---|---:|---|
| Chat assistant | Must | Read-only |
| Daily/proactive briefing | Must | Cached/quota-controlled |
| Role-scoped data tools | Must | Tools call backend services under caller authorization |
| Private conversations | Must | User-private unless product explicitly changes |
| Quotas/cost caps | Must | Server-side config |
| Provider abstraction | Must | MIDAS/Anthropic-compatible support |
| Write-capable AI actions | Later | Requires separate approval workflow |

## 11. Acceptance Rule

A module is parity-complete only when:

1. The user-facing workflow exists in SvelteKit.
2. The Go API enforces validation and authorization.
3. PostgreSQL constraints/migrations support the workflow.
4. Tests cover normal, denied, and edge cases.
5. Data can be migrated or seeded for verification.
6. The behavior matches current TANIA unless a product decision record says otherwise.
