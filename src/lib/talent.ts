export const LEVEL_LABELS: Record<number, string> = {
  1: "1 · Dasar",
  2: "2 · Berkembang",
  3: "3 · Mandiri",
  4: "4 · Mahir",
  5: "5 · Ahli",
};

export interface Skill {
  id: string;
  name: string;
  category: string | null;
}
