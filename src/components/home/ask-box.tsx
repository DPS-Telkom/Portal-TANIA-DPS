"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";

import { askTania } from "@/lib/copilot-events";
import { MAX_QUESTION_CHARS } from "@/lib/copilot";

export function AskBox() {
  const [q, setQ] = useState("");
  return (
    <form
      className="flex items-center gap-2 rounded-2xl border bg-background p-2 pl-4 shadow-[0_8px_30px_-12px_rgba(11,31,77,0.35)] focus-within:ring-2 focus-within:ring-ring"
      onSubmit={(e) => {
        e.preventDefault();
        if (!q.trim()) return askTania();
        askTania(q);
        setQ("");
      }}
    >
      <Sparkles className="size-5 shrink-0 text-violet-500" aria-hidden />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        maxLength={MAX_QUESTION_CHARS}
        placeholder="Tanya TANIA apa saja…"
        aria-label="Tanya TANIA"
        className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
      />
      <button
        type="submit"
        aria-label="Kirim ke TANIA"
        className="grid size-11 shrink-0 place-items-center rounded-full bg-telkom-red text-white transition hover:bg-telkom-red/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <ArrowRight className="size-5" />
      </button>
    </form>
  );
}
