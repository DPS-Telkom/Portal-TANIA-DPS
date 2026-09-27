import { FunctionsHttpError } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

import type { ActivityType } from "./types";

// prd-talent §19, §24 — every AI statement carries its classification.
export interface Classified {
  statement: string;
  source: string;
}

export interface TalentAiBase {
  answer: string;
  facts: Classified[];
  inferences: Classified[];
  recommendations: { action: string; rationale: string }[];
  unknowns: Classified[];
  evidence: { title: string; type: string }[];
  confidence: number;
}

export interface TalentInsight extends TalentAiBase {
  strongest_capability: string | null;
  development_focus: string | null;
}

export interface JourneyStep {
  month: number;
  title: string;
  activity_type: ActivityType;
  skill: string | null;
  rationale: string;
}

export interface TalentJourney extends TalentAiBase {
  objective: string;
  target_role: string;
  duration_months: number;
  steps: JourneyStep[];
}

const isStr = (v: unknown): v is string => typeof v === "string";
const isArr = (v: unknown): v is unknown[] => Array.isArray(v);

/** Validates the AI response contract; returns null when the shape is wrong. */
export function parseTalentAi<T extends TalentAiBase>(raw: unknown, kind: "ask" | "insight" | "journey"): T | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const statements = (v: unknown) => isArr(v) && v.every((x) => x && isStr((x as Classified).statement) && isStr((x as Classified).source));
  const base =
    isStr(r.answer) &&
    statements(r.facts) &&
    statements(r.inferences) &&
    statements(r.unknowns) &&
    isArr(r.recommendations) &&
    r.recommendations.every((x) => x && isStr((x as { action: string }).action)) &&
    isArr(r.evidence) &&
    typeof r.confidence === "number" &&
    r.confidence >= 0 &&
    r.confidence <= 1;
  if (!base) return null;
  if (kind === "insight" && !("strongest_capability" in r && "development_focus" in r)) return null;
  if (
    kind === "journey" &&
    !(isStr(r.objective) && isStr(r.target_role) && typeof r.duration_months === "number" && isArr(r.steps) &&
      r.steps.every((s) => s && typeof (s as JourneyStep).month === "number" && isStr((s as JourneyStep).title)))
  )
    return null;
  return raw as T;
}

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("tania-assistant", { body: { mode: "talent", ...body } });
  if (error) {
    let message = "Talent AI sedang tidak tersedia. Coba lagi nanti.";
    if (error instanceof FunctionsHttpError) {
      try {
        const payload = await error.context.json();
        if (payload?.error) message = payload.error;
      } catch {
        /* default */
      }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data as { result: unknown; cached?: boolean; notice?: string };
}

export async function askTalent(profileId: string, question: string) {
  const res = await call({ kind: "ask", profile_id: profileId, message: question });
  const parsed = parseTalentAi<TalentAiBase>(res.result, "ask");
  if (!parsed) throw new Error("Format jawaban AI tidak valid. Coba lagi.");
  return parsed;
}

export async function talentInsight(profileId: string, force = false) {
  const res = await call({ kind: "insight", profile_id: profileId, force });
  const parsed = parseTalentAi<TalentInsight>(res.result, "insight");
  if (!parsed) throw new Error("Format insight AI tidak valid.");
  return { insight: parsed, cached: Boolean(res.cached), notice: res.notice };
}

export async function recommendJourney(profileId: string, target?: string) {
  const res = await call({ kind: "journey", profile_id: profileId, message: target || undefined });
  const parsed = parseTalentAi<TalentJourney>(res.result, "journey");
  if (!parsed) throw new Error("Format rekomendasi journey tidak valid. Coba lagi.");
  return parsed;
}
