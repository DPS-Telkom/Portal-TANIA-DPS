export type Decision = "go" | "no_go" | "hold";
export type Column = "undecided" | Decision;

export const COLUMN_LABELS: Record<Column, string> = {
  undecided: "Belum diputuskan",
  go: "Go",
  hold: "Hold",
  no_go: "No-Go",
};

export const COLUMN_CLASSES: Record<Column, string> = {
  undecided: "border-t-neutral-400",
  go: "border-t-emerald-500",
  hold: "border-t-amber-500",
  no_go: "border-t-red-500",
};

export const DECISION_BADGE: Record<Column, string> = {
  undecided: "bg-neutral-100 text-neutral-700",
  go: "bg-emerald-100 text-emerald-900",
  hold: "bg-amber-100 text-amber-900",
  no_go: "bg-red-100 text-red-900",
};

// PRD §7.3 — weights as implemented in the generated column (pending AG-01).
export const DIMENSIONS = [
  { key: "score_strategic", label: "Strategic fit", weight: 25, hint: "Keselarasan dengan strategi DPS & Telkom" },
  { key: "score_financial", label: "Financial", weight: 25, hint: "Nilai revenue & margin" },
  { key: "score_risk", label: "Risiko (5 = rendah)", weight: 20, hint: "Makin tinggi skor, makin rendah risiko" },
  { key: "score_resource", label: "Resource", weight: 15, hint: "Ketersediaan talent & kompetensi" },
  { key: "score_technical", label: "Technical", weight: 15, hint: "Kelayakan teknis & solusi" },
] as const;

export type ScoreKey = (typeof DIMENSIONS)[number]["key"];

/** Mirrors the generated total_score (display preview only — DB is the source). */
export function previewTotal(scores: Record<ScoreKey, number>): number {
  return DIMENSIONS.reduce((sum, d) => sum + scores[d.key] * d.weight, 0) / 5;
}

export const RESOURCE_STATUS: Record<string, { label: string; className: string }> = {
  cukup: { label: "Cukup", className: "bg-emerald-100 text-emerald-900" },
  parsial: { label: "Parsial", className: "bg-amber-100 text-amber-900" },
  kurang: { label: "Kurang", className: "bg-red-100 text-red-900" },
};
