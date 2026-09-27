"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addMonths, formatMonth, monthOf, monthRange } from "@/lib/dates";
import { friendlyError } from "@/lib/errors";
import { useThresholds } from "@/lib/settings";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { LOAD_CLASSES, LOAD_LABELS, formatPct, loadLevel, type LoadLevel } from "@/lib/workload";

interface SquadCell {
  squad: string;
  period_month: string;
  people: number;
  avg_utilization_pct: number | null;
  avg_planned_pct: number | null;
}

interface PersonCell {
  profile_id: string;
  full_name: string;
  squad: string | null;
  period_month: string;
  utilization_pct: number | null;
  planned_pct: number;
}

type Mode = "aktual" | "rencana";

// WA-04 — squad × month; click a squad to drill down to its people.
export function Heatmap() {
  const thresholds = useThresholds();
  const current = monthOf();
  const months = useMemo(() => monthRange(addMonths(current, -3), addMonths(current, 2)), [current]);
  const [mode, setMode] = useState<Mode>("aktual");
  const [squads, setSquads] = useState<SquadCell[]>([]);
  const [people, setPeople] = useState<PersonCell[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [s, p] = await Promise.all([
        supabase
          .from("utilization_squad_monthly")
          .select("squad, period_month, people, avg_utilization_pct, avg_planned_pct")
          .gte("period_month", months[0])
          .lte("period_month", months[months.length - 1]),
        supabase
          .from("utilization_monthly")
          .select("profile_id, full_name, squad, period_month, utilization_pct, planned_pct")
          .gte("period_month", months[0])
          .lte("period_month", months[months.length - 1])
          .limit(5000),
      ]);
      setLoading(false);
      if (s.error || p.error) return setError(friendlyError(s.error ?? p.error));
      setSquads((s.data ?? []) as SquadCell[]);
      setPeople((p.data ?? []) as PersonCell[]);
      setLoadedAt(new Date());
    })();
  }, [months]);

  const squadNames = [...new Set(squads.map((s) => s.squad))].sort();
  const squadCell = (squad: string, m: string) => squads.find((s) => s.squad === squad && s.period_month === m);

  function value(avgUtil: number | null | undefined, avgPlanned: number | null | undefined, m: string) {
    // Actual hours do not exist for future months.
    if (mode === "aktual") return m > current ? null : avgUtil ?? null;
    return avgPlanned ?? null;
  }

  function cell(pct: number | null, key: string, bold = false) {
    const level: LoadLevel = loadLevel(pct, thresholds);
    return (
      <td key={key} className="p-1">
        <div
          title={LOAD_LABELS[level]}
          className={cn("rounded px-2 py-1.5 text-center text-xs", LOAD_CLASSES[level], bold && "font-semibold")}
        >
          {pct === null ? "—" : formatPct(pct)}
        </div>
      </td>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList>
            <TabsTrigger value="aktual">Aktual</TabsTrigger>
            <TabsTrigger value="rencana">Rencana</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {(["under", "ok", "high", "over"] as LoadLevel[]).map((l) => (
            <span key={l} className={cn("rounded px-2 py-0.5", LOAD_CLASSES[l])}>
              {LOAD_LABELS[l]}
            </span>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {mode === "aktual"
          ? "Rata-rata utilisasi aktual (jam disetujui ÷ kapasitas). Bulan depan belum punya data aktual."
          : "Rata-rata alokasi rencana."}{" "}
        Hanya orang dalam cakupan akses Anda.
        {loadedAt && ` Data per ${loadedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}.`}
      </p>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Memuat…</p>
      ) : error ? (
        <p className="py-10 text-center text-sm text-destructive">{error}</p>
      ) : squadNames.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Belum ada data alokasi atau timesheet pada periode ini.
        </p>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-2">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left">
                  <th className="px-2 py-1 font-medium">Squad</th>
                  {months.map((m) => (
                    <th key={m} className={cn("px-1 py-1 text-center font-medium", m === current && "text-telkom-red")}>
                      {formatMonth(m)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {squadNames.map((sq) => {
                  const members = [...new Set(people.filter((p) => (p.squad || "Tanpa squad") === sq).map((p) => p.profile_id))];
                  return (
                    <Fragment key={sq}>
                      <tr>
                        <td className="px-2 py-1">
                          <button
                            type="button"
                            className="text-left font-medium hover:text-telkom-red"
                            onClick={() => setOpen(open === sq ? null : sq)}
                            aria-expanded={open === sq}
                          >
                            {open === sq ? "▾" : "▸"} {sq}
                          </button>
                          <div className="text-xs text-muted-foreground">{members.length} orang</div>
                        </td>
                        {months.map((m) => {
                          const c = squadCell(sq, m);
                          return cell(value(c?.avg_utilization_pct, c?.avg_planned_pct, m), m, true);
                        })}
                      </tr>
                      {open === sq &&
                        members.map((pid) => {
                          const rows = people.filter((p) => p.profile_id === pid);
                          return (
                            <tr key={pid} className="bg-muted/30">
                              <td className="py-1 pr-2 pl-6">
                                <Link href={`/talent/profil?id=${pid}`} className="text-sm hover:text-telkom-red hover:underline">
                                  {rows[0]?.full_name}
                                </Link>
                              </td>
                              {months.map((m) => {
                                const r = rows.find((x) => x.period_month === m);
                                return cell(value(r?.utilization_pct, r?.planned_pct, m), m);
                              })}
                            </tr>
                          );
                        })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
