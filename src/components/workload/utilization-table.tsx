"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMonth, isoToMonthInput, monthInputToISO, monthOf } from "@/lib/dates";
import { friendlyError } from "@/lib/errors";
import { useThresholds } from "@/lib/settings";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { LOAD_CLASSES, formatPct, loadLevel } from "@/lib/workload";

interface Row {
  profile_id: string;
  full_name: string;
  squad: string | null;
  approved_hours: number;
  capacity_hours: number;
  utilization_pct: number | null;
  planned_pct: number;
  leave_hours: number;
}

// WA-02 — planned vs actual per person for one month, straight from
// utilization_monthly (never re-aggregated here).
export function UtilizationTable() {
  const thresholds = useThresholds();
  const [month, setMonth] = useState(() => monthOf());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!month) return;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("utilization_monthly")
        .select("profile_id, full_name, squad, approved_hours, capacity_hours, utilization_pct, planned_pct, leave_hours")
        .eq("period_month", month)
        .order("squad", { nullsFirst: false })
        .order("full_name")
        .limit(1000);
      setLoading(false);
      if (error) return setError(friendlyError(error));
      setRows((data ?? []) as Row[]);
      setLoadedAt(new Date());
    })();
  }, [month]);

  const isFuture = month > monthOf();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          type="month"
          className="w-auto"
          value={isoToMonthInput(month)}
          onChange={(e) => setMonth(monthInputToISO(e.target.value))}
          aria-label="Pilih bulan"
        />
        {loadedAt && (
          <span className="text-xs text-muted-foreground">
            {formatMonth(month, true)} · data per{" "}
            {loadedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
      {month === monthOf() && (
        <p className="text-xs text-muted-foreground">
          Bulan berjalan: utilisasi aktual masih bertambah sampai timesheet disetujui.
        </p>
      )}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-3 py-2 font-medium">Nama</th>
                <th className="px-3 py-2 font-medium">Squad</th>
                <th className="px-3 py-2 text-right font-medium">Rencana</th>
                <th className="px-3 py-2 text-right font-medium">Aktual</th>
                <th className="px-3 py-2 text-right font-medium">Jam kerja</th>
                <th className="px-3 py-2 text-right font-medium">Cuti</th>
                <th className="px-3 py-2 text-right font-medium">Kapasitas</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">
                    Memuat…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-destructive">
                    {error}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">
                    Tidak ada alokasi atau timesheet pada bulan ini dalam cakupan Anda.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.profile_id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <Link href={`/talent/profil?id=${r.profile_id}`} className="font-medium hover:text-telkom-red hover:underline">
                        {r.full_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{r.squad ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={cn("rounded px-1.5 py-0.5", LOAD_CLASSES[loadLevel(Number(r.planned_pct), thresholds)])}>
                        {formatPct(r.planned_pct)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isFuture ? (
                        "—"
                      ) : (
                        <span className={cn("rounded px-1.5 py-0.5", LOAD_CLASSES[loadLevel(r.utilization_pct, thresholds)])}>
                          {formatPct(r.utilization_pct)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">{Number(r.approved_hours)}</td>
                    <td className="px-3 py-2 text-right">{Number(r.leave_hours)}</td>
                    <td className="px-3 py-2 text-right">{Number(r.capacity_hours)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
