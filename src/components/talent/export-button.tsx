"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { friendlyError } from "@/lib/errors";
import { exportFileName } from "@/lib/talent-io/schema";

// XM-03 — scope is whatever the caller's RLS allows.
export function TalentExportButton({ profileIds, label = "Export Excel" }: { profileIds?: string[]; label?: string }) {
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      const { buildTalentWorkbook, downloadBlob } = await import("@/lib/talent-io/workbook");
      downloadBlob(await buildTalentWorkbook({ profileIds }), exportFileName());
      toast.success("File Excel dibuat.");
    } catch (e) {
      toast.error(e instanceof Error && !("code" in e) ? e.message : friendlyError(e as { message?: string }));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button variant="outline" onClick={run} disabled={busy} className="gap-1">
      <Download className="size-4" /> {busy ? "Menyiapkan…" : label}
    </Button>
  );
}
