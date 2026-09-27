import type { UserRole } from "./types";

// Addendum B-3: user-facing role names. `pm` stays internal (Feasibility).
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  executive: "Executive",
  chapter_lead: "Chapter Leader",
  manager: "Manager",
  pm: "Project Manager",
  talent: "Talent",
  guest: "Guest",
};

export const ASSIGNABLE_ROLES: UserRole[] = [
  "guest",
  "talent",
  "pm",
  "manager",
  "chapter_lead",
  "executive",
  "admin",
];

export interface NavItem {
  href: string;
  label: string;
  roles: UserRole[];
  /** false until the module ships — rendered disabled, never a dead link. */
  available: boolean;
}

const MEMBERS: UserRole[] = ["talent", "pm", "manager", "chapter_lead", "executive", "admin"];

// Menu visibility is UX only; RLS is the enforcement (CLAUDE.md §2.2).
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", roles: MEMBERS, available: true },
  { href: "/talent", label: "Talent", roles: MEMBERS, available: false },
  { href: "/timesheet", label: "Timesheet", roles: MEMBERS, available: true },
  { href: "/workload", label: "Workload", roles: MEMBERS, available: false },
  { href: "/feasibility", label: "Feasibility", roles: MEMBERS, available: false },
  {
    href: "/budget",
    label: "Budget",
    roles: ["pm", "manager", "chapter_lead", "executive", "admin"],
    available: false,
  },
  { href: "/admin", label: "Admin", roles: ["admin"], available: true },
];

export function isMember(role: UserRole | null | undefined, isActive: boolean | undefined) {
  return Boolean(role && role !== "guest" && isActive);
}

/** Where a signed-in user belongs right after login. */
export function homeFor(role: UserRole | null | undefined, isActive: boolean | undefined) {
  return isMember(role, isActive) ? "/dashboard" : "/menunggu-akses";
}
