"use client";

import { MessageCircle } from "lucide-react";
import { useState } from "react";

import { CopilotPanel } from "@/components/copilot/copilot-panel";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";
import { useMediaQuery } from "@/lib/use-media-query";

// XM-01 — KPI cards per role + TANIA Copilot: docked 360px panel on desktop,
// bottom sheet on mobile. Only one panel is ever mounted, so the briefing is
// requested once per dashboard load (AV-05).
export default function DashboardPage() {
  const { profile } = useAuth();
  const desktop = useMediaQuery("(min-width: 1024px)");
  const [sheetOpen, setSheetOpen] = useState(false);
  if (!profile) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Halo, {profile.full_name || profile.email}</h1>
          <p className="text-muted-foreground">
            {ROLE_LABELS[profile.role]} ·{" "}
            {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <KpiCards />
      </div>

      {desktop ? (
        <CopilotPanel withBriefing className="sticky top-4 h-[calc(100vh-7rem)]" />
      ) : sheetOpen ? (
        <div className="fixed inset-x-0 bottom-0 z-50 h-[85vh] p-2">
          <CopilotPanel withBriefing onClose={() => setSheetOpen(false)} className="h-full shadow-xl" />
        </div>
      ) : (
        <Button className="fixed right-4 bottom-4 z-40 gap-2 rounded-full shadow-lg" onClick={() => setSheetOpen(true)}>
          <MessageCircle className="size-4" /> TANIA Copilot
        </Button>
      )}
    </div>
  );
}
