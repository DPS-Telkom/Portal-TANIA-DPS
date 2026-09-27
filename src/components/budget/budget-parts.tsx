"use client";

import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toISODate } from "@/lib/dates";
import { friendlyError } from "@/lib/errors";
import { formatIDR, formatIDRCompact } from "@/lib/money";
import type { Thresholds } from "@/lib/settings";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export interface LineSummary {
  budget_line_id: string;
  fiscal_year: number;
  program: string;
  category: string;
  plan_amount: number;
  committed: number;
  realized: number;
  remaining: number;
  committed_pct: number | null;
  realized_pct: number | null;
}

export interface GoCase {
  id: string;
  title: string;
}

export type Level = "ok" | "warning" | "critical";

// BC-04 (decision 2026-09-27): badge uses the higher of committed% and realized%.
export function lineLevel(l: Pick<LineSummary, "committed_pct" | "realized_pct" | "plan_amount" | "committed" | "realized">, t: Thresholds): { level: Level; pct: number | null } {
  if (Number(l.plan_amount) <= 0) {
    const spent = Number(l.committed) + Number(l.realized) > 0;
    return { level: spent ? "critical" : "ok", pct: null };
  }
  const pct = Math.max(Number(l.committed_pct ?? 0), Number(l.realized_pct ?? 0));
  if (pct >= t.budgetCritical) return { level: "critical", pct };
  if (pct >= t.budgetWarning) return { level: "warning", pct };
  return { level: "ok", pct };
}

export const LEVEL_BADGE: Record<Level, { label: string; className: string }> = {
  ok: { label: "Aman", className: "bg-emerald-100 text-emerald-900" },
  warning: { label: "Waspada", className: "bg-amber-100 text-amber-900" },
  critical: { label: "Melebihi batas", className: "bg-red-100 text-red-900" },
};

function Bar({ pct, className, label }: { pct: number; className: string; label: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(pct)} aria-label={label}>
        <div className={cn("h-full rounded-full", className)} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

const barColor = (pct: number, t: Thresholds) =>
  pct >= t.budgetCritical ? "bg-red-500" : pct >= t.budgetWarning ? "bg-amber-500" : "bg-emerald-500";

// ---------------------------------------------------------------------------
// Entries of one line (expand) — corrections by chapter_lead/admin only
// ---------------------------------------------------------------------------
interface Entry {
  id: string;
  entry_type: "commitment" | "realization";
  amount: number;
  entry_date: string;
  description: string | null;
  case: { title: string } | null;
  creator: { full_name: string } | null;
}

const PAGE = 20;

function LineEntries({ lineId, canCorrect, onChanged }: { lineId: string; canCorrect: boolean; onChanged: () => void }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    const { data, count, error } = await supabase
      .from("budget_entries")
      .select(
        "id, entry_type, amount, entry_date, description, case:feasibility_cases(title), creator:profiles!budget_entries_created_by_fkey(full_name)",
        { count: "exact" },
      )
      .eq("budget_line_id", lineId)
      .order("entry_date", { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) return toast.error(friendlyError(error));
    setEntries((data ?? []) as unknown as Entry[]);
    setTotal(count ?? 0);
  }, [lineId, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(e: Entry) {
    if (!window.confirm(`Hapus entri ${formatIDR(e.amount)} (${e.entry_date})? Tercatat di audit log.`)) return;
    const { error } = await supabase.from("budget_entries").delete().eq("id", e.id);
    if (error) return toast.error(friendlyError(error));
    toast.success("Entri dihapus.");
    load();
    onChanged();
  }

  if (entries.length === 0) return <p className="py-2 text-xs text-muted-foreground">Belum ada entri.</p>;

  return (
    <div className="space-y-2">
      <ul className="divide-y text-sm">
        {entries.map((e) => (
          <li key={e.id} className="flex items-start justify-between gap-2 py-2">
            <div className="min-w-0">
              <div>
                <span
                  className={cn(
                    "mr-2 rounded px-1.5 py-0.5 text-xs",
                    e.entry_type === "commitment" ? "bg-sky-100 text-sky-900" : "bg-violet-100 text-violet-900",
                  )}
                >
                  {e.entry_type === "commitment" ? "Komitmen" : "Realisasi"}
                </span>
                <span className="font-medium">{formatIDR(e.amount)}</span>
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {new Date(`${e.entry_date}T00:00:00`).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                {e.description ? ` · ${e.description}` : ""}
                {e.case ? ` · case: ${e.case.title}` : ""}
                {e.creator ? ` · ${e.creator.full_name}` : ""}
              </div>
            </div>
            {canCorrect && (
              <Button variant="ghost" size="icon-sm" aria-label="Hapus entri" onClick={() => remove(e)}>
                <Trash2 />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {total > PAGE && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {total} entri · halaman {page + 1}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="xs" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Sebelumnya
            </Button>
            <Button variant="outline" size="xs" disabled={(page + 1) * PAGE >= total} onClick={() => setPage((p) => p + 1)}>
              Berikutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Line card (BC-03/04)
// ---------------------------------------------------------------------------
export function LineCard({
  line,
  thresholds,
  canManage,
  onChanged,
}: {
  line: LineSummary;
  thresholds: Thresholds;
  canManage: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(false);
  const [plan, setPlan] = useState(String(line.plan_amount));
  const { level, pct } = lineLevel(line, thresholds);
  const badge = LEVEL_BADGE[level];
  const committedPct = Number(line.committed_pct ?? 0);
  const realizedPct = Number(line.realized_pct ?? 0);

  async function savePlan() {
    const n = Number(plan);
    if (!Number.isFinite(n) || n < 0) return toast.error("Plan harus angka ≥ 0.");
    const { error } = await supabase.from("budget_lines").update({ plan_amount: n }).eq("id", line.budget_line_id);
    if (error) return toast.error(friendlyError(error));
    toast.success("Plan diperbarui.");
    setEditingPlan(false);
    onChanged();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate">{line.program}</CardTitle>
            <CardDescription>
              {line.category} · FY{line.fiscal_year}
            </CardDescription>
          </div>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", badge.className)}>
            {badge.label}
            {pct !== null && ` · ${Math.round(pct)}%`}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Plan</dt>
          <dd className="text-right font-medium">
            {editingPlan ? (
              <span className="flex justify-end gap-1">
                <Input type="number" min={0} className="h-7 w-36 text-right" value={plan} onChange={(e) => setPlan(e.target.value)} aria-label="Plan amount" />
                <Button size="xs" onClick={savePlan}>
                  Simpan
                </Button>
              </span>
            ) : (
              formatIDRCompact(line.plan_amount)
            )}
          </dd>
          <dt className="text-muted-foreground">Komitmen</dt>
          <dd className="text-right">{formatIDRCompact(line.committed)}</dd>
          <dt className="text-muted-foreground">Realisasi</dt>
          <dd className="text-right">{formatIDRCompact(line.realized)}</dd>
          <dt className="text-muted-foreground">Sisa (plan − realisasi)</dt>
          <dd className={cn("text-right font-medium", Number(line.remaining) < 0 && "text-destructive")}>
            {formatIDRCompact(line.remaining)}
          </dd>
        </dl>
        <Bar pct={committedPct} className={barColor(committedPct, thresholds)} label="Komitmen" />
        <Bar pct={realizedPct} className={barColor(realizedPct, thresholds)} label="Realisasi" />
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {open ? "Sembunyikan entri" : "Lihat entri"}
          </Button>
          {canManage && !editingPlan && (
            <Button variant="ghost" size="sm" onClick={() => setEditingPlan(true)}>
              Ubah plan
            </Button>
          )}
        </div>
        {open && <LineEntries lineId={line.budget_line_id} canCorrect={canManage} onChanged={onChanged} />}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Entry form (BC-02/03)
// ---------------------------------------------------------------------------
const selectClass = "h-8 w-full rounded-md border border-input bg-background px-2 text-sm";

export function EntryForm({ lines, goCases, onSaved }: { lines: LineSummary[]; goCases: GoCase[]; onSaved: () => void }) {
  const [lineId, setLineId] = useState("");
  const [type, setType] = useState<"commitment" | "realization">("commitment");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [description, setDescription] = useState("");
  const [caseId, setCaseId] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!lineId) return toast.error("Pilih budget line.");
    if (!Number.isFinite(n) || n <= 0) return toast.error("Nominal harus lebih dari 0.");
    setBusy(true);
    const { error } = await supabase.from("budget_entries").insert({
      budget_line_id: lineId,
      entry_type: type,
      amount: n,
      entry_date: date,
      description: description.trim() || null,
      feasibility_case_id: caseId || null,
    });
    setBusy(false);
    if (error) {
      toast.error(
        /decided GO/i.test(error.message) ? "Hanya case berstatus Go yang dapat ditautkan." : friendlyError(error),
      );
      return;
    }
    toast.success(`${type === "commitment" ? "Komitmen" : "Realisasi"} ${formatIDR(n)} tercatat.`);
    setAmount("");
    setDescription("");
    setCaseId("");
    onSaved();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Catat komitmen / realisasi</CardTitle>
        <CardDescription>Koreksi atau penghapusan entri hanya oleh Chapter Leader / Admin (tercatat di audit log).</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="be-line">Budget line</Label>
            <select id="be-line" className={selectClass} value={lineId} onChange={(e) => setLineId(e.target.value)}>
              <option value="">Pilih…</option>
              {lines.map((l) => (
                <option key={l.budget_line_id} value={l.budget_line_id}>
                  {l.program} · {l.category}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="be-type">Jenis</Label>
            <select id="be-type" className={selectClass} value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              <option value="commitment">Komitmen</option>
              <option value="realization">Realisasi</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="be-amount">Nominal (Rp)</Label>
            <Input id="be-amount" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="be-date">Tanggal</Label>
            <Input id="be-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="be-case">Feasibility case (Go)</Label>
            <select id="be-case" className={selectClass} value={caseId} onChange={(e) => setCaseId(e.target.value)}>
              <option value="">— Tanpa tautan —</option>
              {goCases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="be-desc">Keterangan</Label>
            <Input id="be-desc" maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={busy || lines.length === 0}>
              {busy ? "Menyimpan…" : "Simpan entri"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// New budget line (BC-01) — chapter_lead/admin
// ---------------------------------------------------------------------------
export function NewLineForm({ year, onSaved }: { year: number; onSaved: () => void }) {
  const [program, setProgram] = useState("");
  const [category, setCategory] = useState("");
  const [plan, setPlan] = useState("");
  const [fy, setFy] = useState(String(year));
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(plan);
    const y = Number(fy);
    if (program.trim().length < 2 || category.trim().length < 2) return toast.error("Program dan kategori wajib diisi.");
    if (!Number.isFinite(n) || n < 0) return toast.error("Plan harus angka ≥ 0.");
    if (!Number.isInteger(y) || y < 2000 || y > 2100) return toast.error("Tahun anggaran tidak valid.");
    setBusy(true);
    const { error } = await supabase
      .from("budget_lines")
      .insert({ fiscal_year: y, program: program.trim(), category: category.trim(), plan_amount: n });
    setBusy(false);
    if (error) {
      toast.error(error.code === "23505" ? "Kombinasi tahun + program + kategori sudah ada." : friendlyError(error));
      return;
    }
    toast.success("Budget line ditambahkan.");
    setProgram("");
    setCategory("");
    setPlan("");
    onSaved();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tambah budget line (RKAP)</CardTitle>
        <CardDescription>Granularitas Tahun → Program → Kategori (AG-04).</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[6rem_1fr_1fr_12rem_auto] lg:items-end">
          <div className="space-y-1">
            <Label htmlFor="bl-fy">Tahun</Label>
            <Input id="bl-fy" type="number" value={fy} onChange={(e) => setFy(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bl-program">Program</Label>
            <Input id="bl-program" maxLength={150} value={program} onChange={(e) => setProgram(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bl-cat">Kategori</Label>
            <Input id="bl-cat" maxLength={100} placeholder="Opex / Capex / …" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bl-plan">Plan (Rp)</Label>
            <Input id="bl-plan" type="number" min={0} value={plan} onChange={(e) => setPlan(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy}>
            Tambah
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
