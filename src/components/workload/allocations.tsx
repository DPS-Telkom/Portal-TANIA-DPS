"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { formatMonth, isoToMonthInput, monthInputToISO, monthOf, monthRange } from "@/lib/dates";
import { friendlyError } from "@/lib/errors";
import { useThresholds } from "@/lib/settings";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LOAD_CLASSES, formatPct, loadLevel } from "@/lib/workload";

interface Allocation {
  id: string;
  profile_id: string;
  project_id: string;
  period_month: string;
  percent: number;
  person: { full_name: string; squad: string | null } | null;
  project: { code: string; name: string; pm_id: string | null } | null;
}

interface Option {
  id: string;
  label: string;
  pm_id?: string | null;
}

const WRITERS: UserRole[] = ["pm", "manager", "chapter_lead", "admin"];
const selectClass = "h-8 w-full rounded-md border border-input bg-background px-2 text-sm";

function AllocationRow({
  a,
  editable,
  onChanged,
}: {
  a: Allocation;
  editable: boolean;
  onChanged: () => void;
}) {
  const [pct, setPct] = useState(String(a.percent));
  const [busy, setBusy] = useState(false);
  const dirty = Number(pct) !== Number(a.percent);

  async function save() {
    const n = Number(pct);
    if (!Number.isFinite(n) || n < 0 || n > 150) return toast.error("Alokasi 0–150%.");
    setBusy(true);
    const { error } = await supabase.from("allocations").update({ percent: n }).eq("id", a.id);
    setBusy(false);
    if (error) return toast.error(friendlyError(error));
    toast.success("Alokasi disimpan.");
    onChanged();
  }

  async function remove() {
    if (!window.confirm(`Hapus alokasi ${a.person?.full_name} di ${a.project?.code}?`)) return;
    const { error } = await supabase.from("allocations").delete().eq("id", a.id);
    if (error) return toast.error(friendlyError(error));
    onChanged();
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-1.5 pl-4">
      <span className="text-muted-foreground">{a.project ? `${a.project.code} · ${a.project.name}` : "—"}</span>
      {editable ? (
        <span className="flex items-center gap-1">
          <Input
            type="number"
            min={0}
            max={150}
            step={5}
            className="h-7 w-20 text-right"
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            aria-label={`Alokasi ${a.person?.full_name} ${a.project?.code}`}
          />
          <span>%</span>
          <Button size="sm" variant="outline" onClick={save} disabled={!dirty || busy}>
            Simpan
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="Hapus alokasi" onClick={remove}>
            <Trash2 />
          </Button>
        </span>
      ) : (
        <span>{Math.round(Number(a.percent))}%</span>
      )}
    </li>
  );
}

// WA-01 — planned allocation per person/project/month.
export function AllocationRegister() {
  const { profile } = useAuth();
  const thresholds = useThresholds();
  const [month, setMonth] = useState(() => monthOf());
  const [rows, setRows] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<Option[]>([]);
  const [projects, setProjects] = useState<Option[]>([]);

  const [personId, setPersonId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [fromMonth, setFromMonth] = useState(() => monthOf());
  const [toMonth, setToMonth] = useState(() => monthOf());
  const [percent, setPercent] = useState("50");
  const [busy, setBusy] = useState(false);

  const canWrite = profile ? WRITERS.includes(profile.role) : false;
  const isPmOnly = profile?.role === "pm";
  const canEditProject = useCallback(
    (pmId: string | null | undefined) => canWrite && (!isPmOnly || pmId === profile?.id),
    [canWrite, isPmOnly, profile],
  );

  const load = useCallback(async () => {
    if (!month) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("allocations")
      .select(
        "id, profile_id, project_id, period_month, percent, person:profiles!allocations_profile_id_fkey(full_name, squad), project:projects(code, name, pm_id)",
      )
      .eq("period_month", month)
      .limit(2000);
    setLoading(false);
    if (error) return toast.error(friendlyError(error));
    setRows((data ?? []) as unknown as Allocation[]);
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!canWrite) return;
    (async () => {
      const [p, pr] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("role", ["talent", "pm", "manager"])
          .eq("is_active", true)
          .order("full_name")
          .limit(1000),
        supabase
          .from("projects")
          .select("id, code, name, pm_id")
          .in("status", ["active", "candidate"])
          .order("code")
          .limit(500),
      ]);
      setPeople((p.data ?? []).map((x) => ({ id: x.id, label: x.full_name || x.email || x.id })));
      setProjects((pr.data ?? []).map((x) => ({ id: x.id, label: `${x.code} · ${x.name}`, pm_id: x.pm_id })));
    })();
  }, [canWrite]);

  const byPerson = useMemo(() => {
    const map = new Map<string, Allocation[]>();
    for (const r of rows) map.set(r.profile_id, [...(map.get(r.profile_id) ?? []), r]);
    return [...map.entries()].sort((a, b) =>
      (a[1][0].person?.full_name ?? "").localeCompare(b[1][0].person?.full_name ?? ""),
    );
  }, [rows]);

  const writableProjects = projects.filter((p) => canEditProject(p.pm_id));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(percent);
    if (!personId || !projectId) return toast.error("Pilih talent dan project.");
    if (!Number.isFinite(n) || n < 0 || n > 150) return toast.error("Alokasi 0–150%.");
    if (!fromMonth || !toMonth || toMonth < fromMonth) return toast.error("Rentang bulan tidak valid.");
    const months = monthRange(fromMonth, toMonth);
    if (months.length > 24) return toast.error("Maksimal 24 bulan sekaligus.");

    setBusy(true);
    const { error } = await supabase.from("allocations").upsert(
      months.map((m) => ({ profile_id: personId, project_id: projectId, period_month: m, percent: n })),
      { onConflict: "profile_id,project_id,period_month" },
    );
    setBusy(false);
    if (error) return toast.error(friendlyError(error));
    toast.success(`Alokasi ${n}% disimpan untuk ${months.length} bulan.`);
    load();
  }

  return (
    <div className="space-y-6">
      {canWrite && (
        <Card>
          <CardHeader>
            <CardTitle>Atur alokasi</CardTitle>
            <CardDescription>
              Menyimpan ulang kombinasi talent + project + bulan yang sama akan memperbarui persentasenya.
              {isPmOnly && " Sebagai Project Manager, Anda hanya dapat mengalokasikan ke project Anda sendiri."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
              <div className="space-y-1 lg:col-span-1">
                <Label htmlFor="al-person">Talent</Label>
                <select id="al-person" className={selectClass} value={personId} onChange={(e) => setPersonId(e.target.value)}>
                  <option value="">Pilih talent…</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 lg:col-span-1">
                <Label htmlFor="al-project">Project</Label>
                <select id="al-project" className={selectClass} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">Pilih project…</option>
                  {writableProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="al-from">Dari bulan</Label>
                <Input id="al-from" type="month" value={isoToMonthInput(fromMonth)} onChange={(e) => setFromMonth(monthInputToISO(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="al-to">Sampai bulan</Label>
                <Input id="al-to" type="month" value={isoToMonthInput(toMonth)} onChange={(e) => setToMonth(monthInputToISO(e.target.value))} />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="al-pct">Alokasi %</Label>
                  <Input id="al-pct" type="number" min={0} max={150} step={5} value={percent} onChange={(e) => setPercent(e.target.value)} />
                </div>
                <Button type="submit" disabled={busy}>
                  Simpan
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          type="month"
          className="w-auto"
          value={isoToMonthInput(month)}
          onChange={(e) => setMonth(monthInputToISO(e.target.value))}
          aria-label="Bulan alokasi"
        />
        <span className="text-sm text-muted-foreground">
          {byPerson.length} orang teralokasi · {formatMonth(month, true)}
        </span>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Memuat…</p>
      ) : byPerson.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Belum ada alokasi pada bulan ini.</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y text-sm">
              {byPerson.map(([pid, items]) => {
                const total = items.reduce((s, a) => s + Number(a.percent), 0);
                const level = loadLevel(total, thresholds);
                return (
                  <li key={pid} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <Link href={`/talent/profil?id=${pid}`} className="font-medium hover:text-telkom-red hover:underline">
                          {items[0].person?.full_name}
                        </Link>
                        <span className="ml-2 text-xs text-muted-foreground">{items[0].person?.squad ?? ""}</span>
                      </div>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs", LOAD_CLASSES[level])}>
                        Total {formatPct(total)}
                        {level === "over" && " · over-alokasi"}
                      </span>
                    </div>
                    <ul>
                      {items.map((a) => (
                        <AllocationRow
                          key={`${a.id}-${a.percent}`}
                          a={a}
                          editable={canEditProject(a.project?.pm_id)}
                          onChanged={load}
                        />
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
