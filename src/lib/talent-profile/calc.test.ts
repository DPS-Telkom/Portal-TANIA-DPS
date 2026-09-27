import { describe, expect, it } from "vitest";

import {
  averageScore,
  certificationStatus,
  experienceYears,
  gap,
  levelLabel,
  performanceTrend,
  planProgress,
  summarize,
  toScore,
} from "./calc";
import type { SkillAssessment, TalentContext } from "./types";

const skill = (over: Partial<SkillAssessment>): SkillAssessment => ({
  skill_id: "s",
  name: "S",
  kind: "competency",
  category: null,
  level: 3,
  target_level: null,
  score: null,
  target_score: null,
  is_certified: false,
  certification_name: null,
  source: "self",
  assessed_at: null,
  confidence: null,
  years_experience: null,
  last_used: null,
  ...over,
});

describe("competency level conversion", () => {
  it("uses the explicit score when present, else level × 20", () => {
    expect(toScore(3, null)).toBe(60);
    expect(toScore(3, 74)).toBe(74);
    expect(toScore(null, null)).toBeNull();
  });
  it("labels levels from the configurable scale", () => {
    expect(levelLabel(4)).toBe("Advanced");
    expect(levelLabel(2, [{ level: 2, label: "Berkembang" }])).toBe("Berkembang");
    expect(levelLabel(null)).toBe("—");
  });
});

describe("capability gap", () => {
  it("is current − target, negative when below target", () => {
    expect(gap(74, 90)).toBe(-16);
    expect(gap(61, 85)).toBe(-24);
    expect(gap(95, 90)).toBe(5);
  });
  it("is null when a side is missing", () => {
    expect(gap(null, 90)).toBeNull();
    expect(gap(70, null)).toBeNull();
  });
});

describe("certification status", () => {
  const today = "2026-09-28";
  it("needs verification before anything else", () => {
    expect(certificationStatus("2030-01-01", "pending", today)).toBe("PENDING_VERIFICATION");
    expect(certificationStatus("2030-01-01", "rejected", today)).toBe("REJECTED");
  });
  it("derives ACTIVE / EXPIRING / EXPIRED from the expiry date", () => {
    expect(certificationStatus(null, "verified", today)).toBe("ACTIVE");
    expect(certificationStatus("2026-09-27", "verified", today)).toBe("EXPIRED");
    expect(certificationStatus("2026-10-15", "verified", today)).toBe("EXPIRING");
    expect(certificationStatus("2026-12-27", "verified", today)).toBe("EXPIRING");
    expect(certificationStatus("2026-12-28", "verified", today)).toBe("ACTIVE");
    expect(certificationStatus("2026-10-15", "verified", today, 10)).toBe("ACTIVE");
  });
});

describe("journey progress", () => {
  it("counts completed over non-skipped activities", () => {
    expect(planProgress([{ status: "completed" }, { status: "planned" }, { status: "skipped" }])).toBe(50);
    expect(planProgress([{ status: "completed" }, { status: "completed" }])).toBe(100);
  });
  it("is null for an empty plan", () => {
    expect(planProgress([])).toBeNull();
    expect(planProgress([{ status: "skipped" }])).toBeNull();
  });
});

describe("experience and summaries", () => {
  it("measures experience from the first position, else join date", () => {
    expect(experienceYears([{ start_date: "2016-09-28" }, { start_date: "2020-01-01" }], "2019-01-01", "2026-09-28")).toBe(10);
    expect(experienceYears([], "2024-09-28", "2026-09-28")).toBe(2);
    expect(experienceYears([], null, "2026-09-28")).toBeNull();
  });
  it("averages only assessed skills of the kind", () => {
    const skills = [skill({ kind: "capability", level: 4 }), skill({ kind: "capability", score: 90 }), skill({ kind: "expertise", level: 5 })];
    expect(averageScore(skills, "capability")).toBe(85);
    expect(averageScore(skills, "competency")).toBeNull();
  });
  it("never invents summary numbers when data is missing", () => {
    const ctx = {
      skills: [],
      certifications: [],
      performance_history: [],
    } as unknown as TalentContext;
    expect(summarize(ctx)).toEqual({ capability: null, expertise: null, certification: null, performance: null });
  });
  it("computes the performance trend from the two latest scored years", () => {
    expect(performanceTrend([{ period_year: 2024, overall_score: 81 }, { period_year: 2025, overall_score: 84 }])).toBe(3);
    expect(performanceTrend([{ period_year: 2025, overall_score: 84 }])).toBeNull();
  });
});
