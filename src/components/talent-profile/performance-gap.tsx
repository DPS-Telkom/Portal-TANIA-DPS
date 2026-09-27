"use client";

import { Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { friendlyError } from "@/lib/errors";
import { askTalent, type TalentAiBase } from "@/lib/talent-profile/ai";
import { performanceTrend } from "@/lib/talent-profile/calc";
import type { TalentPermissions } from "@/lib/talent-profile/permissions";
import { savePerformance } from "@/lib/talent-profile/service";
import type { CompetencyGap, TalentContext } from "@/lib/talent-profile/types";
import { cn } from "@/lib/utils";

import { CERT_STATUS } from "./certification-list";
import { ClassifiedAnswer } from "./classified";
import { EVIDENCE_TYPES } from "./experience-evidence";
import { SOURCE_LABELS } from "./skill-section";
import { EmptyState, Pill, Section, inputClass, textareaClass } from "./section";

const DEFAULT_DIMENSIONS = ["Business Impact", "Customer Impact", "Innovation", "Leadership", "Collaboration", "Execution"];

function PerformanceForm({ profileId, onDone }: { profileId: string; onDone: (saved: boolean) => void }) {
  const [year, setYear] = useState(String(new Date().getFullYear() - 1));
  const [overall, setOverall] = useState("");
  const [rating, setRating] = useState("");
  const [summary, setSummary] = useState("");
  const [source, setSource] = useState<"official" | "manual">("official");
  const [scores, setScores] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const y = Number(year);
    const o = overall === "" ? null : Number(overall);
    const dims = Object.entries(scores)
      .filter(([, v]) => v !== "")
      .map(([dimension, v]) => ({ dimension, score: Number(v) }));
    if (!Number.isInteger(y) || y < 2000 || y > 2100) return toast.error("Tahun tidak valid.");
    if ([o, ...dims.map((d) => d.score)].some((n) => n !== null && (Number.isNaN(n) || n < 0 || n > 100))) return toast.error("Skor 0–100.");
    setBusy(true);
    try {
      await savePerformance(profileId, { period_year: y, overall_score: o, rating: rating.trim() || null, summary: summary.trim() || null, source }, dims);
      toast.success(`Performance ${y} disimpan (tercatat di audit log).`);
      onDone(true);
    } catch (err) {
      toast.error(friendlyError(err as { message?: string; code?: string }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="space-y-1 text-sm">
        Tahun
        <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
      </label>
      <label className="space-y-1 text-sm">
        Skor keseluruhan (0–100)
        <Input type="number" min={0} max={100} value={overall} onChange={(e) => setOverall(e.target.value)} />
      </label>
      <label className="space-y-1 text-sm">
        Rating
        <Input value={rating} placeholder="mis. Exceed" onChange={(e) => setRating(e.target.value)} />
      </label>
      <label className="space-y-1 text-sm">
        Sumber
        <select className={inputClass} value={source} onChange={(e) => setSource(e.target.value as "official" | "manual")}>
          <option value="official">Sistem performance resmi</option>
          <option value="manual">Input manual HR</option>
        </select>
      </label>
      {DEFAULT_DIMENSIONS.map((d) => (
        <label key={d} className="space-y-1 text-sm">
          {d}
          <Input type="number" min={0} max={100} value={scores[d] ?? ""} onChange={(e) => setScores({ ...scores, [d]: e.target.value })} />
        </label>
      ))}
      <label className="space-y-1 text-sm sm:col-span-2 lg:col-span-4">
        Ringkasan
        <textarea className={textareaClass} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </label>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
        <Button type="submit" size="sm" disabled={busy}>
          Simpan
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onDone(false)}>
          Batal
        </Button>
      </div>
    </form>
  );
}

// TP-008 — read-only for talent/manager; written by HR only (DB-enforced).
export function PerformanceHistory({ ctx, perms, onChanged }: { ctx: TalentContext; perms: TalentPermissions; onChanged: () => void }) {
  const history = [...ctx.performance_history].sort((a, b) => b.period_year - a.period_year);
  const [selected, setSelected] = useState<number | null>(history[0]?.period_year ?? null);
  const [adding, setAdding] = useState(false);
  const trend = performanceTrend(history);
  const current = history.find((h) => h.period_year === selected);

  return (
    <Section
      title="Performance History"
      description={
        <span className="inline-flex items-center gap-1">
          <Lock className="size-3.5" /> Read-only. Dicatat oleh HR dari sistem performance; tidak dapat diubah talent maupun AI.
        </span>
      }
      actions={
        perms.canEditPerformance && !adding ? (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            Catat performance
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {adding && (
          <PerformanceForm
            profileId={ctx.talent.id}
            onDone={(saved) => {
              setAdding(false);
              if (saved) onChanged();
            }}
          />
        )}
        {history.length === 0 ? (
          <EmptyState>Performance history belum tersedia.</EmptyState>
        ) : (
          <>
            {trend !== null && (
              <p className="text-sm">
                Tren terhadap tahun sebelumnya:{" "}
                <strong className={trend >= 0 ? "text-emerald-700" : "text-red-700"}>
                  {trend > 0 ? "+" : ""}
                  {trend.toLocaleString("id-ID")} poin
                </strong>
              </p>
            )}
            <ul className="space-y-1.5" aria-label="Skor per tahun">
              {history.map((h) => (
                <li key={h.period_year}>
                  <button
                    type="button"
                    onClick={() => setSelected(h.period_year)}
                    aria-pressed={selected === h.period_year}
                    className={cn(
                      "grid w-full grid-cols-[3.5rem_1fr_3rem] items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      selected === h.period_year && "bg-muted",
                    )}
                  >
                    <span className="font-medium">{h.period_year}</span>
                    <span className="h-2.5 rounded-full bg-muted">
                      <span className="block h-full rounded-full bg-telkom-red/80" style={{ width: `${Math.min(Number(h.overall_score ?? 0), 100)}%` }} />
                    </span>
                    <span className="text-right">{h.overall_score ?? "—"}</span>
                  </button>
                </li>
              ))}
            </ul>
            {current && (
              <div className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-semibold">Performance {current.period_year}</h4>
                  <div className="flex gap-1">
                    {current.rating && <Pill className="border bg-background">{current.rating}</Pill>}
                    <Pill className={current.source === "official" ? "bg-emerald-100 text-emerald-900" : "bg-neutral-100 text-neutral-800"}>
                      {current.source === "official" ? "Official" : "Input manual HR"}
                    </Pill>
                  </div>
                </div>
                {current.scores.length > 0 ? (
                  <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                    {current.scores.map((s) => (
                      <div key={s.dimension} className="flex justify-between border-b py-1">
                        <dt>{s.dimension}</dt>
                        <dd className="font-medium">{s.score}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">Rincian dimensi belum tersedia.</p>
                )}
                {current.summary && <p className="mt-2 text-sm whitespace-pre-line">{current.summary}</p>}
              </div>
            )}
          </>
        )}
      </div>
    </Section>
  );
}

// TP-009 — gaps are computed by the competency_gaps view (current − target).
export function CompetencyGapAnalysis({ ctx }: { ctx: TalentContext }) {
  const gaps = [...ctx.gaps].sort((a, b) => a.gap - b.gap);
  const [open, setOpen] = useState<string | null>(null);
  const [why, setWhy] = useState<Record<string, TalentAiBase | string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function explain(g: CompetencyGap) {
    setBusy(g.skill_id);
    try {
      const res = await askTalent(
        ctx.talent.id,
        `Jelaskan mengapa ada gap pada "${g.name}" (current ${g.current}, target ${g.target}, gap ${g.gap}). Rujuk evidence, sertifikasi, project, dan sumber assessment yang ada, lalu rekomendasikan learning, project assignment, dan mentoring.`,
      );
      setWhy((w) => ({ ...w, [g.skill_id]: res }));
    } catch (e) {
      setWhy((w) => ({ ...w, [g.skill_id]: e instanceof Error ? e.message : "Penjelasan tidak tersedia." }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Section
      title="Competency Gap"
      description="Gap = current − target (skala 0–100; level × 20 bila tidak ada skor). Target ditetapkan manager atau HR."
    >
      {gaps.length === 0 ? (
        <EmptyState>Belum ada target yang ditetapkan, sehingga gap belum dapat dihitung.</EmptyState>
      ) : (
        <ul className="divide-y">
          {gaps.map((g) => {
            const evidence = ctx.evidence.filter((e) => e.skill_id === g.skill_id);
            const certs = ctx.certifications.filter((c) => c.skill_id === g.skill_id);
            const answer = why[g.skill_id];
            const src = SOURCE_LABELS[g.source] ?? SOURCE_LABELS.self;
            return (
              <li key={g.skill_id} className="py-3">
                <button
                  type="button"
                  onClick={() => setOpen(open === g.skill_id ? null : g.skill_id)}
                  aria-expanded={open === g.skill_id}
                  className="grid w-full items-center gap-2 text-left sm:grid-cols-[minmax(10rem,1.2fr)_1fr_4.5rem] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span>
                    <span className="font-medium">{g.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{g.kind}</span>
                  </span>
                  <span className="relative h-2.5 rounded-full bg-muted" aria-hidden>
                    <span className="block h-full rounded-full bg-telkom-red/80" style={{ width: `${Math.min(g.current, 100)}%` }} />
                    <span className="absolute top-[-3px] h-4 w-0.5 bg-foreground" style={{ left: `${Math.min(g.target, 100)}%` }} />
                  </span>
                  <span className={cn("text-right text-sm font-semibold", g.gap < 0 ? "text-red-700" : "text-emerald-700")}>
                    {g.gap > 0 ? "+" : ""}
                    {g.gap}
                  </span>
                </button>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Current {g.current} · Target {g.target} · <Pill className={src.className}>{src.label}</Pill> · {g.evidence_count} evidence
                </div>
                {open === g.skill_id && (
                  <div className="mt-3 space-y-3 rounded-lg border bg-muted/20 p-3 text-sm">
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase">Mengapa? — evidence tercatat</h4>
                      {evidence.length || certs.length ? (
                        <ul className="mt-1 list-disc pl-4">
                          {evidence.map((e) => (
                            <li key={e.id}>
                              {EVIDENCE_TYPES[e.type] ?? e.type}: {e.title} {e.verified ? "(terverifikasi)" : "(belum diverifikasi)"}
                            </li>
                          ))}
                          {certs.map((c) => (
                            <li key={c.id}>
                              Sertifikasi: {c.name} ({CERT_STATUS[c.status].label})
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-muted-foreground">
                          Belum ada evidence untuk {g.name}. Penilaian saat ini berasal dari {src.label.toLowerCase()}.
                        </p>
                      )}
                    </div>
                    {typeof answer === "object" ? (
                      <ClassifiedAnswer data={answer} />
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => explain(g)} disabled={busy === g.skill_id}>
                          {busy === g.skill_id ? "Menganalisis…" : "Tanya TANIA: jelaskan gap ini"}
                        </Button>
                        {typeof answer === "string" && <span className="text-xs text-destructive">{answer}</span>}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
