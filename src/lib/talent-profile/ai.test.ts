import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

import { parseTalentAi } from "./ai";

const base = {
  answer: "Gap terbesar ada pada Agentic AI.",
  facts: [{ statement: "Level AI / GenAI = 2 (self-assessment).", source: "skills: source=self" }],
  inferences: [{ statement: "Eksposur AI masih awal.", source: "skills" }],
  recommendations: [{ action: "Ikuti pelatihan Agentic AI", rationale: "Gap −40" }],
  unknowns: [{ statement: "Belum ada evidence project AI production.", source: "evidence" }],
  evidence: [{ title: "Chatbot pilot", type: "project" }],
  confidence: 0.55,
};

describe("Talent AI response contract", () => {
  it("accepts a well-formed classified answer", () => {
    expect(parseTalentAi(base, "ask")).not.toBeNull();
  });
  it("keeps FACT / INFERENCE / RECOMMENDATION / UNKNOWN separate", () => {
    const parsed = parseTalentAi(base, "ask")!;
    expect(parsed.facts[0].source).toBe("skills: source=self");
    expect(parsed.recommendations[0].action).toContain("Agentic AI");
    expect(parsed.unknowns).toHaveLength(1);
  });
  it("rejects missing classifications or out-of-range confidence", () => {
    const { unknowns: _drop, ...noUnknowns } = base;
    void _drop;
    expect(parseTalentAi(noUnknowns, "ask")).toBeNull();
    expect(parseTalentAi({ ...base, confidence: 1.4 }, "ask")).toBeNull();
    expect(parseTalentAi({ ...base, facts: [{ statement: "x" }] }, "ask")).toBeNull();
    expect(parseTalentAi(null, "ask")).toBeNull();
  });
  it("requires insight fields for the insight kind", () => {
    expect(parseTalentAi(base, "insight")).toBeNull();
    expect(parseTalentAi({ ...base, strongest_capability: null, development_focus: "Agentic AI" }, "insight")).not.toBeNull();
  });
  it("validates the recommended journey schema", () => {
    const journey = {
      ...base,
      objective: "AI Product Leader",
      target_role: "AI Product Lead",
      duration_months: 6,
      steps: [{ month: 1, title: "AI PM course", activity_type: "learning", skill: "AI / GenAI", rationale: "Gap terbesar" }],
    };
    expect(parseTalentAi(journey, "journey")).not.toBeNull();
    expect(parseTalentAi({ ...journey, steps: [{ title: "no month" }] }, "journey")).toBeNull();
  });
});
