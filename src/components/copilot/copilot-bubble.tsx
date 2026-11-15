"use client";

import { useEffect, useState } from "react";

import { CopilotPanel } from "@/components/copilot/copilot-panel";
import { TaniaAvatar } from "@/components/copilot/tania-avatar";
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
      {/* Kept mounted while the panel is open so the 3D avatar (WebGL scene)
          is not torn down and reloaded on every toggle. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buka TANIA Copilot"
        hidden={open}
        className="fixed right-4 bottom-4 z-40 flex items-center gap-2.5 rounded-full bg-tania-navy p-1 text-sm font-semibold text-white shadow-lg hover:bg-tania-navy/90 sm:pr-4"
      >
        <TaniaAvatar className="size-14 border-2 border-telkom-red" />
        <span className="hidden sm:inline">Chat dengan TANIA</span>
      </button>
    </>
  );
}
