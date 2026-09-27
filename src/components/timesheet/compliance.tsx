"use client";

import { useEffect, useMemo, useState } from "react";

import { StatusPill } from "@/components/timesheet/status-pill";
import { WeekNav } from "@/components/timesheet/week-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { addDays, formatHours, mondayOf } from "@/lib/dates";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import type { WeekStatus } from "@/lib/timesheet";

interface ComplianceRow {
  profile_id: string;
  full_name: string;
  email: string | null;
  squad: string | null;
  total_hours: number;
  week_status: WeekStatus;
}

const COMPLIANT: WeekStatus[] = ["submitted", "approved"];

// TS-04 — who has not submitted, per squad. Defaults to last week because the
// chapter deadline is Friday.
export function Compliance() {
  const [monday, setMonday] = useState(() => addDays(mondayOf(), -7));
  const [rows, setRows] = useState<ComplianceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.rpc("timesheet_compliance", { week_start: monday });
      setLoading(false);
      if (error) {
        setError(friendlyError(error));
        return;
      }
      setRows((data ?? []) as ComplianceRow[]);
      setLoadedAt(new Date());
    })();
  }, [monday]);

  const squads = useMemo(() => {
    const map = new Map<string, ComplianceRow[]>();
    for (const r of rows) {
      const key = r.squad || "Tanpa squad";
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return [...map.entries()];
  }, [rows]);

  const compliant = rows.filter((r) => COMPLIANT.includes(r.week_status)).length;
  const pct = rows.length ? Math.round((compliant / rows.length) * 100) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <WeekNav monday={monday} onChange={setMonday} />
        {loadedAt && (
          <span className="text-xs text-muted-foreground">
            Data per {loadedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Memuat…</p>
      ) : error ? (
        <p className="py-10 text-center text-sm text-destructive">{error}</p>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Tidak ada anggota tim dalam cakupan Anda untuk minggu ini.
        </p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardDescription>Kepatuhan submit (target ≥ 95%)</CardDescription>
              <CardTitle className="text-3xl">
                <span className={pct !== null && pct >= 95 ? "text-emerald-700" : "text-telkom-red"}>
                  {pct}%
                </span>
                <span className="ml-2 text-base font-normal text-muted-foreground">
                  {compliant} dari {rows.length} orang sudah submit
                </span>
              </CardTitle>
            </CardHeader>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {squads.map(([squad, members]) => {
              const done = members.filter((m) => COMPLIANT.includes(m.week_status)).length;
              const pending = members.filter((m) => !COMPLIANT.includes(m.week_status));
              return (
                <Card key={squad}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle>{squad}</CardTitle>
                      <span className="text-sm text-muted-foreground">
                        {done}/{members.length} submit
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {pending.length === 0 ? (
                      <p className="text-sm text-emerald-700">Semua sudah submit.</p>
                    ) : (
                      <ul className="divide-y text-sm">
                        {pending.map((m) => (
                          <li key={m.profile_id} className="flex items-center justify-between gap-2 py-2">
                            <div className="min-w-0">
                              <div className="truncate font-medium">{m.full_name || m.email}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatHours(Number(m.total_hours))} jam tercatat
                              </div>
                            </div>
                            <StatusPill status={m.week_status} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
