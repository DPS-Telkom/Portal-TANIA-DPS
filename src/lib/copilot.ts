import { FunctionsHttpError } from "@supabase/supabase-js";

import { supabase } from "./supabase";
import type { UserRole } from "./types";

// Contract (PRD §11.1): POST /functions/v1/tania-assistant with the session JWT.
export const MAX_QUESTION_CHARS = 2000;

interface ChatReply {
  conversation_id: string;
  reply: string;
}

interface BriefingReply {
  reply: string;
  cached: boolean;
  notice?: string;
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>("tania-assistant", { body });
  if (error) {
    let message = "Copilot sedang tidak tersedia. Coba lagi nanti.";
    if (error instanceof FunctionsHttpError) {
      try {
        const payload = await error.context.json();
        if (payload?.error) message = payload.error;
      } catch {
        /* keep default */
      }
    }
    throw new Error(message);
  }
  return data as T;
}

export const askCopilot = (message: string, conversationId?: string | null) =>
  invoke<ChatReply>({ mode: "chat", message, conversation_id: conversationId ?? undefined });

export const getBriefing = (force = false) => invoke<BriefingReply>({ mode: "briefing", force });

// Role-based suggestion chips (AV-01).
export function suggestionsFor(role: UserRole): string[] {
  const personal = ["Berapa utilisasi saya bulan ini?", "Apakah timesheet saya minggu lalu sudah beres?"];
  switch (role) {
    case "talent":
      return [...personal, "Apa saja kompetensi saya yang tercatat?"];
    case "pm":
      return ["Bagaimana posisi budget tahun ini?", "Siapa yang tersedia untuk Data Analytics bulan depan?", ...personal.slice(0, 1)];
    case "hr":
      return ["Apa competency gap terbesar saya?", "Siapa yang tersedia untuk Data Analytics bulan depan?", "Certification apa yang relevan untuk saya?"];
    case "manager":
      return ["Siapa di tim saya yang belum submit timesheet minggu lalu?", "Siapa yang overload bulan ini?", "Siapa yang tersedia untuk Data Analytics bulan depan?"];
    default:
      return ["Ringkas kondisi utilisasi chapter bulan ini", "Case feasibility mana yang perlu diputuskan?", "Budget line mana yang mendekati batas?"];
  }
}
