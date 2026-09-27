"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isoToMonthInput, monthInputToISO } from "@/lib/dates";
import { friendlyError } from "@/lib/errors";
import { DIMENSIONS, previewTotal, type ScoreKey } from "@/lib/feasibility";
import { supabase } from "@/lib/supabase";
import { LEVEL_LABELS, type Skill } from "@/lib/talent";

export interface CaseRecord {
  id: string;
  title: string;
  customer: string | null;
  description: string | null;
  est_revenue: number | null;
  est_effort_hours: number | null;
  est_duration_months: number | null;
  start_month: string | null;
  score_strategic: number;
  score_financial: number;
  score_risk: number;
  score_resource: number;
  score_technical: number;
  total_score: number;
  decision: "go" | "no_go" | "hold" | null;
  decision_rationale: string | null;
  decided_at: string | null;
  decided_by: string | null;
  submitted_by: string;
  created_at: string;
}

export interface RequiredSkill {
  skill_id: string;
  min_level: number;
  headcount: number;
}

const selectClass = "h-8 w-full rounded-md border border-input bg-background px-2 text-sm";

function numOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export function CaseForm({
  initial,
  initialSkills,
  skills,
  onSaved,
  onCancel,
}: {
  initial: CaseRecord | null;
  initialSkills: RequiredSkill[];
  skills: Skill[];
  onSaved: (id: string) => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [customer, setCustomer] = useState(initial?.customer ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [revenue, setRevenue] = useState(initial?.est_revenue?.toString() ?? "");
  const [effort, setEffort] = useState(initial?.est_effort_hours?.toString() ?? "");
  const [duration, setDuration] = useState(initial?.est_duration_months?.toString() ?? "");
  const [startMonth, setStartMonth] = useState(initial?.start_month ?? "");
  const [scores, setScores] = useState<Record<ScoreKey, number>>({
    score_strategic: initial?.score_strategic ?? 0,
    score_financial: initial?.score_financial ?? 0,
    score_risk: initial?.score_risk ?? 0,
    score_resource: initial?.score_resource ?? 0,
    score_technical: initial?.score_technical ?? 0,
  });
  const [required, setRequired] = useState<RequiredSkill[]>(initialSkills);
  const [busy, setBusy] = useState(false);

  const skillName = (id: string) => skills.find((s) => s.id === id)?.name ?? "—";
  const unusedSkills = skills.filter((s) => !required.some((r) => r.skill_id === s.id));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const rev = numOrNull(revenue);
    const eff = numOrNull(effort);
    const dur = numOrNull(duration);
    if (title.trim().length < 3) return toast.error("Judul minimal 3 karakter.");
    if ([rev, eff, dur].some((n) => Number.isNaN(n) || (n !== null && n < 0)))
      return toast.error("Estimasi revenue, effort, dan durasi harus angka ≥ 0.");
    if (dur !== null && (dur < 1 || !Number.isInteger(dur))) return toast.error("Durasi dalam bulan bulat ≥ 1.");
    if (required.some((r) => r.headcount < 1)) return toast.error("Headcount minimal 1.");

    const payload = {
      title: title.trim(),
      customer: customer.trim() || null,
      description: description.trim() || null,
      est_revenue: rev,
      est_effort_hours: eff,
      est_duration_months: dur,
      start_month: startMonth || null,
      ...scores,
    };

    setBusy(true);
    let id = initial?.id;
    if (id) {
      const { error } = await supabase.from("feasibility_cases").update(payload).eq("id", id);
      if (error) {
        setBusy(false);
        return toast.error(friendlyError(error));
      }
    } else {
      const { data, error } = await supabase.from("feasibility_cases").insert(payload).select("id").single();
      if (error || !data) {
        setBusy(false);
        return toast.error(friendlyError(error));
      }
      id = data.id;
    }

    // Replace the competency list (small, owned by this case).
    const del = await supabase.from("feasibility_required_skills").delete().eq("case_id", id);
    if (!del.error && required.length) {
      const ins = await supabase
        .from("feasibility_required_skills")
        .insert(required.map((r) => ({ ...r, case_id: id! })));
      if (ins.error) {
        setBusy(false);
        return toast.error(friendlyError(ins.error));
      }
    }
    setBusy(false);
    if (del.error) return toast.error(friendlyError(del.error));
    toast.success(initial ? "Case disimpan." : "Case baru dibuat.");
    onSaved(id!);
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{initial ? "Ubah case" : "Case baru"}</CardTitle>
          <CardDescription>Intake kandidat project (PF-01). Bisa diubah selama belum diputuskan.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="c-title">Judul</Label>
            <Input id="c-title" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="c-customer">Customer</Label>
            <Input id="c-customer" maxLength={200} value={customer} onChange={(e) => setCustomer(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="c-start">Bulan mulai</Label>
            <Input
              id="c-start"
              type="month"
              value={isoToMonthInput(startMonth)}
              onChange={(e) => setStartMonth(monthInputToISO(e.target.value))}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="c-desc">Deskripsi</Label>
            <textarea
              id="c-desc"
              className="min-h-24 w-full rounded-md border border-input bg-background p-2 text-sm"
              maxLength={5000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="c-rev">Estimasi revenue (Rp)</Label>
            <Input id="c-rev" type="number" min={0} step={1000000} value={revenue} onChange={(e) => setRevenue(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="c-effort">Effort (jam)</Label>
              <Input id="c-effort" type="number" min={0} value={effort} onChange={(e) => setEffort(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="c-dur">Durasi (bulan)</Label>
              <Input id="c-dur" type="number" min={1} step={1} value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Scoring</CardTitle>
              <CardDescription>Skor 0–5 per dimensi. Total 0–100 dihitung database (indikatif, AG-01).</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{Math.round(previewTotal(scores))}</div>
              <div className="text-xs text-muted-foreground">dari 100</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {DIMENSIONS.map((d) => (
            <div key={d.key} className="grid gap-1 sm:grid-cols-[14rem_1fr_2rem] sm:items-center">
              <label htmlFor={d.key} className="text-sm">
                <span className="font-medium">{d.label}</span>
                <span className="ml-1 text-xs text-muted-foreground">({d.weight}%)</span>
                <span className="block text-xs text-muted-foreground">{d.hint}</span>
              </label>
              <input
                id={d.key}
                type="range"
                min={0}
                max={5}
                step={1}
                className="accent-telkom-red"
                value={scores[d.key]}
                onChange={(e) => setScores((s) => ({ ...s, [d.key]: Number(e.target.value) }))}
              />
              <span className="text-right font-semibold">{scores[d.key]}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kompetensi dibutuhkan</CardTitle>
          <CardDescription>Dasar resource check terhadap alokasi & kompetensi talent (PF-03).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {required.length === 0 && <p className="text-sm text-muted-foreground">Belum ada kompetensi.</p>}
          {required.map((r, i) => (
            <div key={r.skill_id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
              <span className="text-sm font-medium">{skillName(r.skill_id)}</span>
              <select
                className={selectClass}
                value={r.min_level}
                aria-label={`Level minimum ${skillName(r.skill_id)}`}
                onChange={(e) =>
                  setRequired((list) => list.map((x, j) => (j === i ? { ...x, min_level: Number(e.target.value) } : x)))
                }
              >
                {[1, 2, 3, 4, 5].map((l) => (
                  <option key={l} value={l}>
                    ≥ {LEVEL_LABELS[l]}
                  </option>
                ))}
              </select>
              <Input
                type="number"
                min={1}
                max={50}
                className="h-8 w-20"
                aria-label={`Headcount ${skillName(r.skill_id)}`}
                value={r.headcount}
                onChange={(e) =>
                  setRequired((list) => list.map((x, j) => (j === i ? { ...x, headcount: Number(e.target.value) } : x)))
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Hapus ${skillName(r.skill_id)}`}
                onClick={() => setRequired((list) => list.filter((_, j) => j !== i))}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          {unusedSkills.length > 0 && (
            <select
              className={selectClass}
              value=""
              aria-label="Tambah kompetensi dibutuhkan"
              onChange={(e) =>
                e.target.value && setRequired((list) => [...list, { skill_id: e.target.value, min_level: 3, headcount: 1 }])
              }
            >
              <option value="">+ Tambah kompetensi…</option>
              {unusedSkills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            Batal
          </Button>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? "Menyimpan…" : initial ? "Simpan perubahan" : "Buat case"}
        </Button>
      </div>
    </form>
  );
}
