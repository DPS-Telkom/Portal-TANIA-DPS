"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { CopilotPanel } from "@/components/copilot/copilot-panel";
import { onAskTania } from "@/lib/copilot-events";

// AV-01 — floating entry point on every page except the dashboard, where the
// copilot is docked. Bottom sheet on mobile, corner panel on desktop.
export function CopilotBubble() {
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState<{ text: string; nonce: number } | null>(null);

  useEffect(
    () =>
      onAskTania(({ question }) => {
        setOpen(true);
        if (question) setInitial({ text: question, nonce: Date.now() });
      }),
    [],
  );

  return (
    <>
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-50 h-[80vh] p-2 sm:inset-x-auto sm:right-4 sm:bottom-20 sm:h-[560px] sm:w-[380px] sm:p-0">
          <CopilotPanel withBriefing={false} initialQuestion={initial} onClose={() => setOpen(false)} className="h-full shadow-xl" />
        </div>
      )}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka TANIA Copilot"
          className="fixed right-4 bottom-4 z-40 grid size-12 place-items-center rounded-full bg-telkom-red text-white shadow-lg hover:bg-telkom-red/90"
        >
          <MessageCircle className="size-6" />
        </button>
      )}
    </>
  );
}
