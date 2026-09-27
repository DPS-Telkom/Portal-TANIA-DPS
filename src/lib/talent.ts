// Default level labels — mirror of public.level_scales (admin/HR-configurable);
// the Talent Profile reads the live scale, lists use these defaults.
export const LEVEL_LABELS: Record<number, string> = {
  1: "1 · Foundation",
  2: "2 · Beginner",
  3: "3 · Intermediate",
  4: "4 · Advanced",
  5: "5 · Expert",
};

export type SkillKind = "capability" | "competency" | "expertise";

export const KIND_LABELS: Record<SkillKind, string> = {
  capability: "Capability",
  competency: "Competency",
  expertise: "Expertise",
};

export interface Skill {
  id: string;
  name: string;
  category: string | null;
  kind?: SkillKind;
}

/** Groups a skill list for <optgroup> rendering. */
export function groupByKind<T extends { kind?: SkillKind }>(skills: T[]): [SkillKind, T[]][] {
  const order: SkillKind[] = ["capability", "competency", "expertise"];
  return order
    .map((k) => [k, skills.filter((s) => (s.kind ?? "competency") === k)] as [SkillKind, T[]])
    .filter(([, list]) => list.length > 0);
}
