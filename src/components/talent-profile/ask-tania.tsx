"use client";

import { Send, Sparkles, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { askTalent, type TalentAiBase } from "@/lib/talent-profile/ai";

import { ClassifiedAnswer } from "./classified";

const SELF_QUESTIONS = [
  "Apa capability yang paling perlu saya tingkatkan?",
  "Apa competency gap terbesar saya?",
  "Project apa yang paling relevan untuk role berikutnya?",
  "Certification apa yang relevan untuk saya?",
  "Bagaimana performance saya dibanding tahun lalu?",
  "Seperti apa development journey 6 bulan ke depan untuk saya?",
];

const OTHER_QUESTIONS = [
  "Apa kekuatan utama talent ini berdasarkan evidence?",
  "Apa competency gap terbesarnya?",
  "Coaching apa yang paling berdampak untuk kuartal ini?",
  "Project apa yang cocok untuk mengembangkan gap-nya?",
];

interface Turn {
  question: string;
  answer?: TalentAiBase;
  error?: string;
}

// TP-012 — Ask TANIA scoped to ONE talent profile. The context is built
// server-side from talent_context() with the caller's JWT, so the AI only
// sees what the caller is allowed to see.
export function AskTania({ profileId, name, isSelf, onClose }: { profileId: string; name: string; isSelf: boolean; onClose: () => void }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const suggestions = isSelf ? SELF_QUESTIONS : OTHER_QUESTIONS;

  async function ask(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    setInput("");
    setTurns((t) => [...t, { question }]);
    setBusy(true);
    try {
      const answer = await askTalent(profileId, question);
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, answer } : x)));
    } catch (e) {
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, error: e instanceof Error ? e.message : "Gagal." } : x)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-label="Ask TANIA"
      className="fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col rounded-t-xl border bg-background shadow-2xl sm:inset-x-auto sm:top-4 sm:right-4 sm:bottom-4 sm:h-auto sm:w-[420px] sm:rounded-xl"
    >
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div>
          <div className="flex items-center gap-1.5 font-semibold">
            <Sparkles className="size-4 text-telkom-red" /> Ask TANIA
          </div>
          <div className="text-xs text-muted-foreground">Konteks: profil {isSelf ? "Anda" : name}</div>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Tutup Ask TANIA" onClick={onClose}>
          <X />
        </Button>
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {turns.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Jawaban memisahkan FACT, INFERENCE, RECOMMENDATION, dan UNKNOWN beserta evidence-nya.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border px-2.5 py-1 text-left text-xs hover:border-telkom-red hover:text-telkom-red">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className="space-y-2">
            <p className="ml-auto w-fit max-w-[90%] rounded-lg bg-telkom-red px-3 py-2 text-sm text-white">{t.question}</p>
            {t.answer ? (
              <div className="rounded-lg bg-muted/50 p-3">
                <ClassifiedAnswer data={t.answer} />
              </div>
            ) : t.error ? (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{t.error}</p>
            ) : (
              <p className="text-xs text-muted-foreground">TANIA sedang membaca profil…</p>
            )}
          </div>
        ))}
      </div>
      <form
        className="flex items-end gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <textarea
          className="max-h-28 min-h-9 flex-1 resize-none rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          rows={1}
          maxLength={2000}
          placeholder="Tanyakan tentang profil ini…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(input);
            }
          }}
          aria-label="Pertanyaan untuk Ask TANIA"
        />
        <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Kirim">
          <Send />
        </Button>
      </form>
    </section>
  );
}
