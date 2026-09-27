"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  EntryForm,
  LEVEL_BADGE,
  LineCard,
  NewLineForm,
  lineLevel,
  type GoCase,
  type LineSummary,
} from "@/components/budget/budget-parts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { formatMonth } from "@/lib/dates";
import { friendlyError } from "@/lib/errors";
import { formatIDR, formatIDRCompact } from "@/lib/money";
import { useThresholds } from "@/lib/settings";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const READERS: UserRole[] = ["pm", "manager", "chapter_lead", "executive", "admin"];
const WRITERS: UserRole[] = ["pm", "manager", "chapter_lead", "admin"];
const MANAGERS: UserRole[] = ["chapter_lead", "admin"];

interface Monthly {
  period_month: string;
  committed: number;
  realized: number;
}

const selectClass = "h-8 rounded-md border border-input bg-background px-2 text-sm";

export default function BudgetPage() {
  const { profile } = useAuth();
  const thresholds = useThresholds();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [years, setYears] = useState<number[]>([thisYear]);
  const [lines, setLines] = useState<LineSummary[]>([]);
  const [monthly, setMonthly] = useState<Monthly[]>([]);
  const [goCases, setGoCases] = useState<GoCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const allowed = profile ? READERS.includes(profile.role) : false;

  const load = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    const [s, m, y, g] = await Promise.all([
      supabase
        .from("budget_summary")
        .select("budget_line_id, fiscal_year, program, category, plan_amount, committed, realized, remaining, committed_pct, realized_pct")
        .eq("fiscal_year", year)
        .order("program")
        .order("category"),
      supabase.from("budget_monthly").select("period_month, committed, realized").eq("fiscal_year", year).limit(5000),
      supabase.from("budget_lines").select("fiscal_year").limit(1000),
      supabase.from("feasibility_cases").select("id, title").eq("decision", "go").order("title").limit(500),
    ]);
    setLoading(false);
    if (s.error || m.error) return setError(friendlyError(s.error ?? m.error));
    setError(null);
    setLines((s.data ?? []) as LineSummary[]);
    setMonthly((m.data ?? []) as Monthly[]);
    setYears([...new Set([thisYear, ...(y.data ?? []).map((r) => r.fiscal_year)])].sort((a, b) => b - a));
    setGoCases((g.data ?? []) as GoCase[]);
    setLoadedAt(new Date());
  }, [allowed, year, thisYear]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(
    () =>
      lines.reduce(
        (t, l) => ({
          plan: t.plan + Number(l.plan_amount),
          committed: t.committed + Number(l.committed),
          realized: t.realized + Number(l.realized),
        }),
        { plan: 0, committed: 0, realized: 0 },
      ),
    [lines],
  );

  const byProgram = useMemo(() => {
    const map = new Map<string, { plan: number; committed: number; realized: number; lines: number }>();
    for (const l of lines) {
      const cur = map.get(l.program) ?? { plan: 0, committed: 0, realized: 0, lines: 0 };
      map.set(l.program, {
        plan: cur.plan + Number(l.plan_amount),
        committed: cur.committed + Number(l.committed),
        realized: cur.realized + Number(l.realized),
        lines: cur.lines + 1,
      });
    }
    return [...map.entries()];
  }, [lines]);

  // BC-05 burn rate: realized per month, projected linearly to year end.
  const burn = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}-01`);
    const perMonth = months.map((m) => ({
      month: m,
      realized: monthly.filter((r) => r.period_month === m).reduce((s, r) => s + Number(r.realized), 0),
    }));
    const elapsed = year < thisYear ? 12 : year > thisYear ? 0 : new Date().getMonth() + 1;
    const avg = elapsed ? totals.realized / elapsed : 0;
    return { perMonth, elapsed, avg, projection: avg * 12, max: Math.max(1, ...perMonth.map((p) => p.realized)) };
  }, [monthly, year, thisYear, totals.realized]);

  if (!profile) return null;
  if (!allowed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget</CardTitle>
          <CardDescription>Modul Budget tidak tersedia untuk role Anda.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const canWrite = WRITERS.includes(profile.role);
  const canManage = MANAGERS.includes(profile.role);
  const overall = lineLevel(
    {
      plan_amount: totals.plan,
      committed: totals.committed,
      realized: totals.realized,
      committed_pct: totals.plan ? (totals.committed / totals.plan) * 100 : null,
      realized_pct: totals.plan ? (totals.realized / totals.plan) * 100 : null,
    },
    thresholds,
  );
  const projectionOver = totals.plan > 0 && burn.projection > totals.plan;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Budget</h1>
          <p className="text-muted-foreground">Plan vs komitmen vs realisasi per program dan kategori.</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="fy" className="text-sm text-muted-foreground">
            Tahun anggaran
          </label>
          <select id="fy" className={selectClass} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Memuat…</p>
      ) : error ? (
        <p className="py-10 text-center text-sm text-destructive">{error}</p>
      ) : (
        <Tabs defaultValue="ringkasan">
          <TabsList>
            <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
            <TabsTrigger value="line">Budget line</TabsTrigger>
            {canWrite && <TabsTrigger value="entri">Catat entri</TabsTrigger>}
          </TabsList>

          <TabsContent value="ringkasan" className="space-y-6 pt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Plan", totals.plan],
                ["Komitmen", totals.committed],
                ["Realisasi", totals.realized],
                ["Sisa", totals.plan - totals.realized],
              ].map(([label, value]) => (
                <Card key={label as string}>
                  <CardHeader>
                    <CardDescription>{label}</CardDescription>
                    <CardTitle className="text-2xl" title={formatIDR(value as number)}>
                      {formatIDRCompact(value as number)}
                    </CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", LEVEL_BADGE[overall.level].className)}>
                {LEVEL_BADGE[overall.level].label}
                {overall.pct !== null && ` · ${Math.round(overall.pct)}%`}
              </span>
              <span className="text-muted-foreground">
                Kuning ≥ {thresholds.budgetWarning}%, merah ≥ {thresholds.budgetCritical}% (tertinggi dari komitmen/realisasi).
                {loadedAt && ` Data per ${loadedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}.`}
              </span>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Burn rate realisasi {year}</CardTitle>
                <CardDescription>
                  {burn.elapsed
                    ? `Rata-rata ${formatIDRCompact(burn.avg)}/bulan selama ${burn.elapsed} bulan · proyeksi akhir tahun ${formatIDRCompact(burn.projection)}`
                    : "Tahun anggaran belum berjalan."}
                  {projectionOver && (
                    <span className="ml-1 font-medium text-destructive">— melebihi plan {formatIDRCompact(totals.plan)}</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex h-40 items-end gap-1" role="img" aria-label={`Realisasi per bulan ${year}`}>
                  {burn.perMonth.map((p) => (
                    <div key={p.month} className="flex flex-1 flex-col items-center gap-1" title={`${formatMonth(p.month)}: ${formatIDR(p.realized)}`}>
                      <div
                        className="w-full rounded-t bg-telkom-red/80"
                        style={{ height: `${(p.realized / burn.max) * 100}%`, minHeight: p.realized ? 2 : 0 }}
                      />
                      <span className="text-[10px] text-muted-foreground">{formatMonth(p.month).split(" ")[0]}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Per program</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {byProgram.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada budget line untuk {year}.</p>
                ) : (
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-1 font-medium">Program</th>
                        <th className="py-1 text-right font-medium">Plan</th>
                        <th className="py-1 text-right font-medium">Komitmen</th>
                        <th className="py-1 text-right font-medium">Realisasi</th>
                        <th className="py-1 text-right font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byProgram.map(([program, v]) => {
                        const lv = lineLevel(
                          {
                            plan_amount: v.plan,
                            committed: v.committed,
                            realized: v.realized,
                            committed_pct: v.plan ? (v.committed / v.plan) * 100 : null,
                            realized_pct: v.plan ? (v.realized / v.plan) * 100 : null,
                          },
                          thresholds,
                        );
                        return (
                          <tr key={program} className="border-b last:border-0">
                            <td className="py-1.5">
                              {program} <span className="text-xs text-muted-foreground">({v.lines} line)</span>
                            </td>
                            <td className="py-1.5 text-right">{formatIDRCompact(v.plan)}</td>
                            <td className="py-1.5 text-right">{formatIDRCompact(v.committed)}</td>
                            <td className="py-1.5 text-right">{formatIDRCompact(v.realized)}</td>
                            <td className="py-1.5 text-right">
                              <span className={cn("rounded-full px-2 py-0.5 text-xs", LEVEL_BADGE[lv.level].className)}>
                                {LEVEL_BADGE[lv.level].label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="line" className="space-y-6 pt-4">
            {canManage && <NewLineForm year={year} onSaved={load} />}
            {lines.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Belum ada budget line untuk {year}.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {lines.map((l) => (
                  <LineCard
                    key={`${l.budget_line_id}-${l.plan_amount}-${l.committed}-${l.realized}`}
                    line={l}
                    thresholds={thresholds}
                    canManage={canManage}
                    onChanged={load}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {canWrite && (
            <TabsContent value="entri" className="pt-4">
              <EntryForm lines={lines} goCases={goCases} onSaved={load} />
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
