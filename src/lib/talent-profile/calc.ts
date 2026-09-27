// Pure calculations for the Talent Profile — no I/O, unit-tested.
import type {
  ActivityStatus,
  CareerPosition,
  CertificationStatus,
  LevelScaleItem,
  SkillAssessment,
  SkillKind,
  TalentContext,
} from "./types";

export const DEFAULT_LEVEL_SCALE: LevelScaleItem[] = [
  { level: 1, label: "Foundation" },
  { level: 2, label: "Beginner" },
  { level: 3, label: "Intermediate" },
  { level: 4, label: "Advanced" },
  { level: 5, label: "Expert" },
];

export function levelLabel(level: number | null | undefined, scale: LevelScaleItem[] = DEFAULT_LEVEL_SCALE): string {
  if (level === null || level === undefined) return "—";
  return scale.find((s) => s.level === level)?.label ?? `Level ${level}`;
}

/** 0–100 value of an assessment: explicit score wins, else level × 20 (matches the competency_gaps view). */
export function toScore(level: number | null | undefined, score?: number | null): number | null {
  if (score !== null && score !== undefined) return Number(score);
  if (level === null || level === undefined) return null;
  return level * 20;
}

/** gap = current − target (negative means below target); null when either side is missing. */
export function gap(current: number | null, target: number | null): number | null {
  if (current === null || target === null) return null;
  return Math.round((current - target) * 100) / 100;
}

export function certificationStatus(
  expiresOn: string | null,
  verification: "pending" | "verified" | "rejected",
  today: string,
  expiringDays = 90,
): CertificationStatus {
  if (verification === "rejected") return "REJECTED";
  if (verification !== "verified") return "PENDING_VERIFICATION";
  if (!expiresOn) return "ACTIVE";
  if (expiresOn < today) return "EXPIRED";
  const limit = new Date(`${today}T00:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() + expiringDays);
  return expiresOn <= limit.toISOString().slice(0, 10) ? "EXPIRING" : "ACTIVE";
}

/** Completed share of non-skipped activities, 0–100; null when there is nothing to do. */
export function planProgress(activities: { status: ActivityStatus }[]): number | null {
  const relevant = activities.filter((a) => a.status !== "skipped");
  if (!relevant.length) return null;
  return Math.round((relevant.filter((a) => a.status === "completed").length / relevant.length) * 100);
}

/** Years of experience from the earliest career position, else join date. */
export function experienceYears(positions: Pick<CareerPosition, "start_date">[], joinDate: string | null, today: string): number | null {
  const starts = positions.map((p) => p.start_date).filter(Boolean).sort();
  const from = starts[0] ?? joinDate;
  if (!from) return null;
  // Calendar months (not 365.25-day years), so an exact anniversary is a whole year.
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = today.split("-").map(Number);
  const months = (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
  return Math.max(0, Math.floor((months / 12) * 10) / 10);
}

/** Average 0–100 of the assessments of one kind; null when not assessed. */
export function averageScore(skills: SkillAssessment[], kind: SkillKind): number | null {
  const values = skills
    .filter((s) => s.kind === kind)
    .map((s) => toScore(s.level, s.score))
    .filter((v): v is number => v !== null);
  if (!values.length) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export interface SummaryCards {
  capability: number | null;
  expertise: number | null;
  certification: { active: number; total: number } | null;
  performance: { score: number | null; year: number } | null;
}

export function summarize(ctx: TalentContext): SummaryCards {
  const certs = ctx.certifications;
  const latest = [...ctx.performance_history].sort((a, b) => b.period_year - a.period_year)[0];
  return {
    capability: averageScore(ctx.skills, "capability"),
    expertise: averageScore(ctx.skills, "expertise"),
    certification: certs.length
      ? { active: certs.filter((c) => c.status === "ACTIVE" || c.status === "EXPIRING").length, total: certs.length }
      : null,
    performance: latest ? { score: latest.overall_score === null ? null : Number(latest.overall_score), year: latest.period_year } : null,
  };
}

/** Performance trend: difference between the two latest overall scores. */
export function performanceTrend(history: { period_year: number; overall_score: number | null }[]): number | null {
  const scored = history.filter((h) => h.overall_score !== null).sort((a, b) => b.period_year - a.period_year);
  if (scored.length < 2) return null;
  return Math.round((Number(scored[0].overall_score) - Number(scored[1].overall_score)) * 10) / 10;
}

/** Positions ordered oldest → newest with the items that fall in each period. */
export function inPeriod(date: string | null, start: string, end: string | null): boolean {
  if (!date) return false;
  return date >= start && (!end || date <= end);
}
