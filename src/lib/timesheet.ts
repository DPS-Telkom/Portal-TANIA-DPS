export type TimesheetStatus = "draft" | "submitted" | "approved" | "rejected";
export type WeekStatus = "belum_isi" | TimesheetStatus;

export const STATUS_LABELS: Record<WeekStatus, string> = {
  belum_isi: "Belum isi",
  draft: "Draft",
  submitted: "Menunggu persetujuan",
  approved: "Disetujui",
  rejected: "Ditolak",
};

export const STATUS_CLASSES: Record<WeekStatus, string> = {
  belum_isi: "bg-neutral-100 text-neutral-700",
  draft: "bg-amber-100 text-amber-900",
  submitted: "bg-sky-100 text-sky-900",
  approved: "bg-emerald-100 text-emerald-900",
  rejected: "bg-red-100 text-red-900",
};

/** Worst state wins, matching timesheet_compliance() in migration 5. */
export function summarizeStatus(statuses: TimesheetStatus[]): WeekStatus {
  if (statuses.length === 0) return "belum_isi";
  if (statuses.includes("rejected")) return "rejected";
  if (statuses.includes("draft")) return "draft";
  if (statuses.includes("submitted")) return "submitted";
  return "approved";
}

export function isEditable(status: TimesheetStatus | undefined) {
  return status === undefined || status === "draft" || status === "rejected";
}

export const MAX_HOURS_PER_ENTRY = 24;
