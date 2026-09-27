import type { Thresholds } from "./settings";

export type LoadLevel = "none" | "under" | "ok" | "high" | "over";

/** Classify a utilization/planned %. `high` = within 10 points of overload. */
export function loadLevel(pct: number | null | undefined, t: Thresholds): LoadLevel {
  if (pct === null || pct === undefined) return "none";
  if (pct > t.utilizationOver) return "over";
  if (pct >= t.utilizationOver - 10) return "high";
  if (pct < t.utilizationUnder) return "under";
  return "ok";
}

export const LOAD_CLASSES: Record<LoadLevel, string> = {
  none: "bg-muted/40 text-muted-foreground",
  under: "bg-sky-100 text-sky-900",
  ok: "bg-emerald-100 text-emerald-900",
  high: "bg-amber-100 text-amber-900",
  over: "bg-red-200 text-red-950 font-semibold",
};

export const LOAD_LABELS: Record<LoadLevel, string> = {
  none: "Tidak ada data",
  under: "Underload",
  ok: "Normal",
  high: "Mendekati penuh",
  over: "Overload",
};

export function formatPct(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return "N/A";
  return `${Math.round(Number(pct))}%`;
}
