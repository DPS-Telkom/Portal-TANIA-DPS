# TANIA Frontend Component Standards

Purpose: define frontend component standards for the SvelteKit rewrite so UI stays consistent, reusable, and maintainable as modules grow.

The goal is to avoid giant page files and duplicated UI logic. Pages should compose reusable components, not contain full module implementations inline.

## 1. Principles

1. **Design system first**: shared UI primitives should exist before module pages duplicate controls.
2. **Small components**: split by responsibility, not by arbitrary line count.
3. **Composition over copy-paste**: reuse base components and module components.
4. **Consistent behavior**: tables, forms, dialogs, validation, empty states, and loading states should behave the same everywhere.
5. **Backend owns authorization**: frontend role checks are for UX only.
6. **Typed API boundaries**: components should consume typed API data, not raw `fetch` calls scattered across pages.
7. **Accessibility by default**: keyboard navigation, focus states, labels, contrast, and screen-reader semantics.

## 2. Recommended Frontend Structure

```text
apps/web/src/
├── routes/                         # SvelteKit pages/routes
│   ├── (public)/
│   ├── (app)/
│   └── settings/
├── lib/
│   ├── api/                        # API client wrappers / generated client integration
│   ├── components/
│   │   ├── ui/                     # reusable primitives
│   │   ├── layout/                 # app shell/nav/header
│   │   ├── forms/                  # reusable form wrappers/fields
│   │   ├── data-display/           # table, cards, empty state
│   │   ├── feedback/               # toast, alert, loading, error
│   │   └── modules/                # module-specific reusable components
│   ├── design/                     # tokens, theme, colors, spacing
│   ├── stores/                     # session, app settings, global UI state
│   ├── validation/                 # client-side validation helpers
│   ├── utils/                      # formatting, dates, currency
│   └── types/                      # frontend-only types if not generated
└── app.css
```

If `packages/ui` is created later, move stable primitives from `apps/web/src/lib/components/ui` into `packages/ui`.

## 3. Component Layers

### 3.1 UI Primitives

Reusable across all modules. These should be generic and not know about TANIA business rules.

Examples:

- Button
- Input
- Textarea
- Select / combobox
- Checkbox / switch
- Date picker
- Month picker
- Dialog / modal
- Drawer / sheet
- Tabs
- Badge
- Card
- Tooltip
- Popover
- Toast
- Skeleton/loading
- Empty state
- Error state
- Pagination
- Data table shell
- File upload/dropzone

### 3.2 Layout Components

Shared app structure:

- App shell
- Sidebar navigation
- Topbar
- User menu
- Breadcrumbs
- Page header
- Responsive mobile drawer
- Authenticated route guard UX
- Guest waiting layout

### 3.3 Form Components

Reusable form patterns:

- Field wrapper
- Label + help text
- Validation message
- Submit/cancel footer
- Dirty-state warning
- Confirmation dialog
- Server error summary
- Read-only field display

### 3.4 Data Display Components

Reusable display patterns:

- Data table with pagination/filter/sort
- KPI card
- Status pill
- Timeline
- Audit log viewer
- Detail panel/drawer
- Section card
- Stat grid

### 3.5 Module Components

Business-aware components that belong to TANIA modules but remain reusable inside that module.

Examples:

- `modules/timesheet/WeeklyGrid.svelte`
- `modules/timesheet/ApprovalQueue.svelte`
- `modules/talent/SkillMatrix.svelte`
- `modules/talent/StaffingCandidateList.svelte`
- `modules/workload/UtilizationHeatmap.svelte`
- `modules/feasibility/ScoringForm.svelte`
- `modules/budget/BudgetSummaryTable.svelte`
- `modules/copilot/CopilotPanel.svelte`
- `modules/iam/ApiTokenTable.svelte`
- `modules/iam/RoleAssignmentForm.svelte`

## 4. Page Composition Rule

Svelte route files should stay thin.

Recommended page responsibilities:

- Read route params/search params.
- Load data through typed API functions.
- Compose module components.
- Handle high-level navigation state.

Avoid route files that contain:

- Large tables implemented inline.
- Repeated forms.
- Business authorization logic.
- Raw fetch calls in every component.
- Complex date/currency formatting logic.

Example pattern:

```svelte
<!-- routes/(app)/timesheet/+page.svelte -->
<script lang="ts">
  import TimesheetPage from '$lib/components/modules/timesheet/TimesheetPage.svelte';
  export let data;
</script>

<TimesheetPage week={data.week} entries={data.entries} />
```

## 5. API Client Rule

Components should not call arbitrary endpoint strings directly.

Preferred flow:

```text
component -> module API wrapper -> generated API client -> backend
```

Example:

```text
TimesheetPage.svelte
  -> $lib/api/timesheets.ts
  -> packages/api-client
  -> /api/v1/timesheets
```

Benefits:

- Easier refactor if endpoint changes.
- Better type safety.
- Centralized error handling.
- Easier testing/mocking.

## 6. Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Svelte component | PascalCase | `ApiTokenTable.svelte` |
| Utility file | kebab-case or camelCase, pick one and keep consistent | `formatCurrency.ts` |
| Module folder | lowercase/kebab-case | `talent-profile` |
| Store | `*.store.ts` | `session.store.ts` |
| API wrapper | module name | `timesheets.ts` |
| Design token | semantic name | `color-danger`, `space-4` |

Recommended: use PascalCase for components and lowercase module folders.

## 7. Component Size Guidance

Do not enforce a hard line count blindly, but use these warning signs:

- Component exceeds 250-300 lines.
- Component mixes data fetching, form state, table rendering, and dialogs.
- Same markup pattern appears in 2+ places.
- Props become hard to understand.
- Test setup becomes painful.

When that happens, split into:

- Container/page component
- Presentational components
- Form component
- Table component
- Dialog component
- Shared helper functions

## 8. State Management

Prefer local state first.

Use stores for:

- Auth/session state
- Global app shell state
- User preferences/theme
- Cross-page filters only when intentionally shared

Avoid global stores for:

- One form's temporary state
- One table's local filters
- API data that should be reloaded by route/page boundaries

## 9. Styling Standards

Use a consistent styling approach:

- Central theme tokens for color, spacing, radius, typography.
- Semantic colors: success/warning/danger/info/muted.
- Avoid one-off arbitrary styles in page files unless necessary.
- Prefer component variants over custom per-page CSS.

Example button variants:

- `primary`
- `secondary`
- `outline`
- `ghost`
- `danger`

Example status variants:

- `draft`
- `submitted`
- `approved`
- `rejected`
- `overload`
- `warning`

## 10. Forms and Validation

Validation should be layered:

1. Client-side validation for UX.
2. Server-side validation for truth.
3. Database constraints for integrity.

Client validation must not be treated as security.

Form components should support:

- Field-level errors.
- Server error summary.
- Disabled/submitting state.
- Confirmation for destructive writes.
- Success/failure feedback.

## 11. Tables

All large lists should use a standard table component with:

- Pagination.
- Loading state.
- Empty state.
- Error state.
- Sort/filter hooks where needed.
- Responsive fallback.
- Consistent row action menus.

Never load unbounded lists into the browser for audit log, timesheets, users, or large talent directories.

## 12. Accessibility Requirements

Minimum:

- All inputs have labels.
- Dialogs trap focus and close predictably.
- Buttons have accessible names.
- Keyboard navigation works for menus/dialogs.
- Color is not the only status indicator.
- Error messages are connected to fields.
- Loading states do not trap users silently.

## 13. Testing Expectations

Test reusable components more than page glue.

Recommended tests:

- Unit/component tests for complex UI controls.
- Accessibility checks for primitives if tooling is available.
- E2E smoke tests for critical flows:
  - login
  - guest waiting flow
  - admin role assignment
  - token generation/revocation
  - timesheet submit/approve
  - feasibility decision
  - budget entry
  - copilot chat

## 14. Design System Inventory to Create

Before building modules, create these first:

1. `Button`
2. `Input`
3. `Select/Combobox`
4. `DatePicker`
5. `Dialog`
6. `Drawer`
7. `DataTable`
8. `Pagination`
9. `StatusBadge`
10. `KpiCard`
11. `PageHeader`
12. `SectionCard`
13. `FormField`
14. `ErrorSummary`
15. `EmptyState`
16. `LoadingState`
17. `ConfirmDialog`
18. `FileUpload`
19. `AuditTimeline`
20. `CopySecretBox` for one-time PAT display

## 15. Review Checklist

Before accepting a frontend PR:

- [ ] Page files are thin and compose components.
- [ ] Repeated UI patterns use shared components.
- [ ] API calls go through typed wrappers/client.
- [ ] Loading/error/empty states are present.
- [ ] Forms handle server validation errors.
- [ ] Destructive actions require confirmation.
- [ ] Accessibility basics are covered.
- [ ] Component names and folders follow convention.
- [ ] No frontend-only authorization assumption is used as security.
