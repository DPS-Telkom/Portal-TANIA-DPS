"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { addMonths, formatMonth, monthOf } from "@/lib/dates";
import { friendlyError } from "@/lib/errors";
import { useThresholds } from "@/lib/settings";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { formatPct } from "@/lib/workload";

interface Row {
  profile_id: string;
  full_name: string;
  squad: string | null;
  period_month: string;
  utilization_pct: number | null;
  planned_pct: number;
}

type AlertKind = "over_planned" | "over_actual" | "under_actual";

interface WorkloadAlert {
  key: string;
  kind: AlertKind;
  row: Row;
  value: number;
}

const KIND_LABELS: Record<AlertKind, string> = {
  over_planned: "Overload rencana",
  over_actual: "Overload aktual",
  under_actual: "Underload aktual",
};

const KIND_CLASSES: Record<AlertKind, string> = {
  over_planned: "bg-amber-100 text-amber-900",
  over_actual: "bg-red-100 text-red-900",
  under_actual: "bg-sky-100 text-sky-900",
};

// WA-03 — threshold rules (plain logic, no AI):
//  * planned > over  → current and upcoming months
//  * actual  > over  → past and current months
//  * actual  < under → completed months only (the running month is still filling)
export function WorkloadAlerts() {
  const t = useThresholds();
  const current = monthOf();
  const from = addMonths(current, -3);
  const to = addMonths(current, 2);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detectedAt, setDetectedAt] = useState<Date | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("utilization_monthly")
        .select("profile_id, full_name, squad, period_month, utilization_pct, planned_pct")
        .gte("period_month", from)
        .lte("period_month", to)
        .limit(5000);
      setLoading(false);
      if (error) return setError(friendlyError(error));
      setRows((data ?? []) as Row[]);
      setDetectedAt(new Date());
    })();
  }, [from, to]);

  const alerts = useMemo(() => {
    const out: WorkloadAlert[] = [];
    for (const r of rows) {
      const planned = Number(r.planned_pct);
      const actual = r.utilization_pct === null ? null : Number(r.utilization_pct);
      if (r.period_month >= current && planned > t.utilizationOver)
        out.push({ key: `${r.profile_id}-${r.period_month}-p`, kind: "over_planned", row: r, value: planned });
      if (r.period_month <= current && actual !== null && actual > t.utilizationOver)
        out.push({ key: `${r.profile_id}-${r.period_month}-a`, kind: "over_actual", row: r, value: actual });
      if (r.period_month < current && actual !== null && actual < t.utilizationUnder)
        out.push({ key: `${r.profile_id}-${r.period_month}-u`, kind: "under_actual", row: r, value: actual });
    }
    const order: AlertKind[] = ["over_actual", "over_planned", "under_actual"];
    return out.sort(
      (a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || b.row.period_month.localeCompare(a.row.period_month),
    );
  }, [rows, t, current]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Overload di atas <strong>{t.utilizationOver}%</strong>, underload di bawah{" "}
        <strong>{t.utilizationUnder}%</strong> (bulan yang sudah selesai). Periode{" "}
        {formatMonth(from)} – {formatMonth(to)}.
        {detectedAt &&
          ` Terdeteksi ${detectedAt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}.`}
      </p>
      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Memuat…</p>
      ) : error ? (
        <p className="py-10 text-center text-sm text-destructive">{error}</p>
      ) : alerts.length === 0 ? (
        <p className="py-10 text-center text-sm text-emerald-700">Tidak ada pelanggaran threshold. 👍</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y text-sm">
              {alerts.map((a) => (
                <li key={a.key} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/talent/profil?id=${a.row.profile_id}`}
                      className="font-medium hover:text-telkom-red hover:underline"
                    >
                      {a.row.full_name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {a.row.squad ?? "Tanpa squad"} · {formatMonth(a.row.period_month, true)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", KIND_CLASSES[a.kind])}>
                      {KIND_LABELS[a.kind]}
                    </span>
                    <span className="w-12 text-right font-semibold">{formatPct(a.value)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
