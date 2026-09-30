# TANIA RBAC Matrix — Current Roles Baseline

Purpose: baseline the production rewrite authorization model from the roles and policies that exist in the current TANIA implementation.

Source baseline:

- `CLAUDE.md` role permission matrix
- `supabase/migrations/20260927000002_rls_policies.sql`
- `supabase/migrations/20260927000004_avatar_copilot.sql`
- `supabase/migrations/20260927000007_talent_workload.sql`
- `supabase/migrations/20260928000002_talent_profile.sql`

This matrix is for rewrite parity. If product wants different access in production, record that as a product decision before changing the matrix.

## 1. Roles

| Role | Meaning in current system | Baseline behavior |
|---|---|---|
| `guest` | Newly registered user waiting for admin approval | Can read/update only own limited profile fields; no module data |
| `talent` | Individual contributor/talent | Own profile, own skills, own timesheet, limited module reads |
| `pm` | Project Manager | Talent capabilities plus own project updates, feasibility submission, budget read/entry |
| `manager` | People/project manager | Direct-report timesheet review, allocations/projects/master data writes, feasibility submission, budget read/entry |
| `chapter_lead` | Chapter leadership | Broad module access, feasibility decision, budget full, audit read |
| `hr` | HR/Talent Management | Talent-profile HR-owned data, skill/level management, talent development data |
| `executive` | Management read-only role | Broad read access for dashboards/reporting, no operational writes except own basics |
| `admin` | System administrator | User/role administration and broad operational write access |

Important current rules:

- `guest` is the default role for all sign-ups.
- Inactive users resolve to no role and should have zero module access.
- Public/anonymous users have no module data access.
- Frontend hiding/showing menus is not authorization; production rewrite must enforce these rules in the Go API.

## 2. High-Level Module Matrix

Legend:

- `Own`: own row/profile/data only
- `DR`: direct reports
- `Line`: direct/indirect reporting line
- `Read`: read allowed
- `Write`: create/update/delete where workflow allows
- `Full`: broad read/write/admin within the module
- `-`: no access

| Module / Capability | guest | talent | pm | manager | chapter_lead | hr | executive | admin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Own profile basic fields | Limited | Own | Own | Own | Own | Own | Own | Own |
| Role/user administration | - | - | - | - | - | - | - | Full |
| Profiles directory | - | Read | Read | Read | Read | Read | Read | Full |
| Own skills/competencies | - | Own write | Own write | Own write | Own write | Own write | Own write | Full |
| Others' skills/competencies | - | Read | Read | DR/Line write | Write | HR write | Read | Full |
| Talent profile 360 view | - | Own | Own + scoped read | Line/DR read | Read | Read | Read | Full |
| Talent development data | - | Own/participate | Own/participate | Line/DR write | Write | Write | Read | Full |
| HR-owned talent data | - | - | - | - | - | Write | Read | Full |
| Projects | - | Read | Own project write | Write | Write/delete | Read | Read | Full |
| Activities/master data | - | Read | Read | Write | Write | Read | Read | Full |
| Allocations | - | Read | Write for owned projects | Write | Write | Read | Read | Full |
| Own timesheets | - | CRUD workflow | CRUD workflow | CRUD workflow | CRUD workflow | CRUD workflow | CRUD workflow | CRUD workflow |
| Others' timesheets | - | - | - | DR approve/reject | All approve/reject | Read if scoped via talent? | Read all | All approve/reject |
| Timesheet compliance | - | Own/scoped | Scoped | DR/scoped | All | Scoped | All read | All |
| Feasibility cases | - | Read | Submit/edit own draft | Submit/edit own draft | Full + decide | Read | Read | Full + decide |
| Feasibility required skills | - | Read | Own case write | Own case write | Write | Read | Read | Full |
| Budget lines | - | - | Read | Read | Full | Read? | Read | Full |
| Budget entries | - | - | Insert/read | Insert/read | Full | Read? | Read | Full |
| Audit log | - | - | - | - | Read | - | - | Read |
| App settings | - | Read | Read | Read | Read | Read | Read/write | Read/write |
| Copilot chat/briefing | - | Own | Own | Own | Own | Own | Own | Own |
| Copilot tools | - | Caller-scoped | Caller-scoped | Caller-scoped | Caller-scoped | Caller-scoped | Caller-scoped | Caller-scoped |
| Attachments | - | Member read / own upload | Member read / own upload | Member read / own upload | Member read/delete | Member read / own upload | Member read / own upload | Member read/delete |

Notes:

- HR budget read access is not explicitly present in the original budget policy list. Treat as `Read?` pending product decision. Current production rewrite should not grant HR budget write access unless approved.
- Current `timesheets_select` grants executive read-all and manager direct-report read. HR is not listed there unless covered by later product policy. Treat HR timesheet access as product decision if needed.
- Current `can_view_talent()` grants HR/executive/admin/chapter_lead broad talent view plus reporting line access.

## 3. Profile and User Administration

| Action | guest | talent | pm | manager | chapter_lead | hr | executive | admin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Read own profile | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Read member profiles | No | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Update own `full_name` | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Update own `location` | No | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Update own `photo_path` | No | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Update own role | No | No | No | No | No | No | No | No self-demotion/deactivate |
| Update role/is_active/manager_id/email | No | No | No | No | No | No | No | Admin only |
| Update direct report `squad`/`grade` | No | No | No | Yes | Yes if manager/lead policy allows | No | No | Yes |
| Update HR work attributes | No | No | No | No | No | Yes | No | Yes |

HR work attributes from current migration:

- `squad`
- `grade`
- `employee_id`
- `position_title`
- `organization`
- `career_level`
- `join_date`
- `photo_path`

Production rewrite rule: these field-level rules must become explicit Go policy tests, not implicit frontend behavior.

## 4. Talent Profile Authorization

Current helper semantics:

```text
can_view_talent(profile)
  = self
  OR anyone above profile in reporting line
  OR chapter_lead/hr/executive/admin

can_develop_talent(profile)
  = self
  OR anyone above profile in reporting line
  OR chapter_lead/hr/admin
```

| Talent Profile Area | Self | Reporting line | chapter_lead | hr | executive | admin |
|---|---:|---:|---:|---:|---:|---:|
| View profile detail | Yes | Yes | Yes | Yes | Yes | Yes |
| View positions/projects/certifications/evidence | Yes | Yes | Yes | Yes | Yes | Yes |
| Create/update project experience | Yes | No unless HR/admin | No unless HR/admin | Yes | No | Yes |
| Create/update certifications | Yes | No unless HR/admin | No unless HR/admin | Yes | No | Yes |
| Create/update evidence | Yes | Yes | Yes | Yes | No | Yes |
| Create/update development plans | Yes | Yes | Yes | Yes | No | Yes |
| Create/update performance reviews/scores | No | No | No | Yes | No | Yes |
| Update level scale | No | No | No | Yes | No | Yes |
| Run Talent AI request | Yes if can view target | Yes if can view target | Yes | Yes | Yes | Yes |

## 5. Timesheet Authorization

Workflow baseline:

```text
draft/rejected -> owner edits -> draft/submitted
submitted      -> reviewer -> approved/rejected
approved       -> immutable in R1
```

Reviewer baseline:

- Direct manager of the timesheet owner
- `chapter_lead`
- `admin`
- Reviewer cannot be the same person as owner

| Action | talent | pm | manager | chapter_lead | hr | executive | admin |
|---|---:|---:|---:|---:|---:|---:|---:|
| Create own draft/submitted row | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Edit own draft/rejected row | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Delete own draft/rejected row | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Edit approved row | No | No | No | No | No | No | No |
| Approve/reject direct report | No | No | Yes | Yes | No | No | Yes |
| Approve/reject anyone | No | No | No | Yes | No | No | Yes |
| Read direct report rows | No | No | Yes | Yes | Product decision | Yes? | Yes |
| Read all rows | No | No | No | Yes | Product decision | Yes | Yes |

Notes:

- Current policy gives executive read access to all timesheets but not approval rights.
- HR timesheet read/review is not clearly granted by current RLS. Keep denied until product decides otherwise.

## 6. Project, Activity, Allocation Authorization

| Action | talent | pm | manager | chapter_lead | hr | executive | admin |
|---|---:|---:|---:|---:|---:|---:|---:|
| Read projects/activities | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Create projects | No | No | Yes | Yes | No | No | Yes |
| Update owned project | No | Yes | Yes | Yes | No | No | Yes |
| Delete projects | No | No | No | Yes | No | No | Yes |
| Write activities/master data | No | No | Yes | Yes | No | No | Yes |
| Read allocations | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Write allocations for owned PM projects | No | Yes | Yes | Yes | No | No | Yes |
| Write allocations broadly | No | No | Yes | Yes | No | No | Yes |

## 7. Feasibility Authorization

| Action | talent | pm | manager | chapter_lead | hr | executive | admin |
|---|---:|---:|---:|---:|---:|---:|---:|
| Read cases | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Submit case | No | Yes | Yes | Yes | No | No | Yes |
| Edit own undecided case | No | Yes | Yes | Yes | No | No | Yes |
| Delete own undecided case | Member-owned only if submitter | Yes | Yes | Yes | No | No | Yes |
| Decide go/no-go/hold | No | No | No | Yes | No | No | Yes |
| Change decision/rationale | No | No | No | Yes | No | No | Yes |
| Write required skills on allowed case | No | Own case | Own case | Yes | No | No | Yes |

Decision rules:

- Decision requires non-empty rationale.
- `decided_by` and `decided_at` are server-stamped.
- Production rewrite should keep the decision gate server-side.

## 8. Budget Authorization

| Action | talent | pm | manager | chapter_lead | hr | executive | admin |
|---|---:|---:|---:|---:|---:|---:|---:|
| Read budget lines | No | Yes | Yes | Yes | Product decision | Yes | Yes |
| Create/update/delete budget lines | No | No | No | Yes | No | No | Yes |
| Read budget entries | No | Yes | Yes | Yes | Product decision | Yes | Yes |
| Insert budget entries | No | Yes | Yes | Yes | No | No | Yes |
| Update/delete budget entries | No | No | No | Yes | No | No | Yes |
| View budget summary | No | Yes | Yes | Yes | Product decision | Yes | Yes |

Current explicit rule: `talent` has no budget access.

Production rewrite decision needed: whether `hr` should have budget read access. Current budget policies do not include HR.

## 9. Copilot / AI Authorization

| Action | guest | talent | pm | manager | chapter_lead | hr | executive | admin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Use general copilot chat | No | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Read own chat history | No | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Read others' chat history | No | No | No | No | No | No | No | No |
| Generate daily briefing | No | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Run copilot data tools | No | Caller-scoped | Caller-scoped | Caller-scoped | Caller-scoped | Caller-scoped | Caller-scoped | Caller-scoped |
| AI writes module data | No | No | No | No | No | No | No | No |

Copilot must remain read-only in parity rewrite. Any write-capable AI action requires a separate approval workflow and product decision.

## 10. Audit, Settings, and Storage

| Area / Action | talent | pm | manager | chapter_lead | hr | executive | admin |
|---|---:|---:|---:|---:|---:|---:|---:|
| Read audit log | No | No | No | Yes | No | No | Yes |
| Write audit log manually | No | No | No | No | No | No | No |
| Read app settings | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Update app settings | No | No | No | No | No | No | Yes |
| Read attachments bucket | Member | Member | Member | Member | Member | Member | Member/Admin |
| Upload own attachment | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Delete own attachment | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Delete others' attachments | No | No | No | Yes | No | No | Yes |
| Read talent files | If can view talent | If can view talent | If can view talent | If can view talent | If can view talent | If can view talent | If can view talent |
| Upload talent photos/certificates | Own or HR/admin | Own or HR/admin | Own or HR/admin | Own or HR/admin | Yes | Own only? | Yes |

## 11. Backend Policy Test Requirements

For the production Go API, create policy tests at minimum for:

1. Guest cannot read module data.
2. Inactive user cannot read module data.
3. Talent cannot read budget.
4. Talent can CRUD own draft/rejected timesheet only.
5. Manager can approve direct-report submitted timesheet, but not edit content.
6. Manager cannot approve own timesheet.
7. Executive can read summaries/timesheets but cannot approve/write operational data.
8. Chapter lead can decide feasibility and read audit log.
9. Admin can assign roles but cannot demote/deactivate self.
10. HR can update HR-owned talent profile fields, but not role/is_active/manager_id/email.
11. Copilot cannot access data outside caller policy scope.
12. Chat history is private per user.
13. Approved timesheets are immutable.
14. Feasibility decision requires rationale.
15. Budget update/delete is limited to chapter_lead/admin.

## 12. Open RBAC Decisions for Production

These are unclear or worth confirming before implementation:

1. Should HR read timesheets/compliance, or only talent profile data?
2. Should HR read budget summaries, or stay excluded like talent?
3. Should executive read audit log, or remain excluded?
4. Should chapter_lead/admin have explicit ability to impersonate/scoped-view users for support? Current system does not define impersonation.
5. Should manager access be direct-report only or full reporting-line for all modules?
6. Should project managers see only their projects for budget/allocation, or current broad read remains acceptable?
7. Should guest be allowed to edit only `full_name`, or also photo/location while waiting approval?
