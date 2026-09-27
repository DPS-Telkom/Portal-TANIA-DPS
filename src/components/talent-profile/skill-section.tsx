"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { friendlyError } from "@/lib/errors";
import { gap, levelLabel, toScore } from "@/lib/talent-profile/calc";
import type { TalentPermissions } from "@/lib/talent-profile/permissions";
import { addAssessment, removeAssessment, updateAssessment, type AssessmentInput } from "@/lib/talent-profile/service";
import type { SkillAssessment, SkillKind, TalentContext } from "@/lib/talent-profile/types";
import { cn } from "@/lib/utils";

import { EmptyState, Pill, Section, inputClass } from "./section";

export interface CatalogSkill {
  id: string;
  name: string;
  category: string | null;
  kind: SkillKind;
}

const TITLES: Record<SkillKind, { title: string; description: string; empty: string }> = {
  capability: {
    title: "Capability",
    description: "Kemampuan per domain (current vs target), dengan assessment, evidence, dan kebutuhan pengembangan.",
    empty: "Belum ada data capability.",
  },
  competency: {
    title: "Competency",
    description: "Kompetensi terukur mengikuti level framework organisasi.",
    empty: "Belum ada data competency.",
  },
  expertise: {
    title: "Expertise",
    description: "Bidang keahlian: proficiency, tahun pengalaman, terakhir dipakai, dan evidence.",
    empty: "Belum ada data expertise.",
  },
};

export const SOURCE_LABELS: Record<string, { label: string; className: string }> = {
  self: { label: "Self-assessment", className: "bg-neutral-100 text-neutral-800" },
  manager: { label: "Manager", className: "bg-sky-100 text-sky-900" },
  hr: { label: "HR", className: "bg-emerald-100 text-emerald-900" },
  assessment: { label: "Assessment", className: "bg-emerald-100 text-emerald-900" },
  system: { label: "Sistem", className: "bg-emerald-100 text-emerald-900" },
};

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("id-ID", { dateStyle: "medium" }) : "—");

function Bar({ current, target }: { current: number | null; target: number | null }) {
  return (
    <div className="relative h-2 w-full min-w-24 rounded-full bg-muted" aria-hidden>
      {current !== null && <div className="h-full rounded-full bg-telkom-red/80" style={{ width: `${Math.min(current, 100)}%` }} />}
      {target !== null && <div className="absolute top-[-3px] h-3.5 w-0.5 bg-foreground" style={{ left: `${Math.min(target, 100)}%` }} />}
    </div>
  );
}

function EditRow({
  item,
  kind,
  perms,
  scale,
  onDone,
}: {
  item: SkillAssessment;
  kind: SkillKind;
  perms: TalentPermissions;
  scale: TalentContext["level_scale"];
  onDone: (patch: AssessmentInput | null) => void;
}) {
  const [v, setV] = useState({
    level: item.level,
    score: item.score?.toString() ?? "",
    target_level: item.target_level?.toString() ?? "",
    target_score: item.target_score?.toString() ?? "",
    confidence: item.confidence ?? "",
    years_experience: item.years_experience?.toString() ?? "",
    last_used: item.last_used ?? "",
  });
  const num = (s: string) => (s.trim() === "" ? null : Number(s));

  function save() {
    const score = num(v.score);
    const tScore = num(v.target_score);
    if ([score, tScore].some((n) => n !== null && (Number.isNaN(n) || n < 0 || n > 100))) return toast.error("Skor 0–100.");
    const patch: AssessmentInput = {
      level: v.level,
      score,
      confidence: (v.confidence || null) as AssessmentInput["confidence"],
      years_experience: num(v.years_experience),
      last_used: v.last_used || null,
    };
    if (perms.canSetTargets) {
      patch.target_level = num(v.target_level);
      patch.target_score = tScore;
    }
    onDone(patch);
  }

  return (
    <div className="grid gap-2 rounded-md border bg-muted/20 p-3 sm:grid-cols-3 lg:grid-cols-6">
      <label className="space-y-1 text-xs">
        Level saat ini
        <select className={inputClass} value={v.level} onChange={(e) => setV({ ...v, level: Number(e.target.value) })}>
          {scale.map((s) => (
            <option key={s.level} value={s.level}>
              {s.level} · {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-xs">
        Skor 0–100 (opsional)
        <input className={inputClass} type="number" min={0} max={100} value={v.score} onChange={(e) => setV({ ...v, score: e.target.value })} />
      </label>
      {perms.canSetTargets && (
        <>
          <label className="space-y-1 text-xs">
            Target level
            <select className={inputClass} value={v.target_level} onChange={(e) => setV({ ...v, target_level: e.target.value })}>
              <option value="">—</option>
              {scale.map((s) => (
                <option key={s.level} value={s.level}>
                  {s.level} · {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs">
            Target skor (opsional)
            <input className={inputClass} type="number" min={0} max={100} value={v.target_score} onChange={(e) => setV({ ...v, target_score: e.target.value })} />
          </label>
        </>
      )}
      <label className="space-y-1 text-xs">
        Keyakinan
        <select className={inputClass} value={v.confidence} onChange={(e) => setV({ ...v, confidence: e.target.value as typeof v.confidence })}>
          <option value="">—</option>
          <option value="low">Rendah</option>
          <option value="medium">Sedang</option>
          <option value="high">Tinggi</option>
        </select>
      </label>
      {kind === "expertise" && (
        <>
          <label className="space-y-1 text-xs">
            Tahun pengalaman
            <input className={inputClass} type="number" min={0} step={0.5} value={v.years_experience} onChange={(e) => setV({ ...v, years_experience: e.target.value })} />
          </label>
          <label className="space-y-1 text-xs">
            Terakhir dipakai
            <input className={inputClass} type="date" value={v.last_used} onChange={(e) => setV({ ...v, last_used: e.target.value })} />
          </label>
        </>
      )}
      <div className="flex items-end gap-2 sm:col-span-3 lg:col-span-6">
        <Button size="sm" onClick={save}>
          Simpan
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDone(null)}>
          Batal
        </Button>
        {!perms.canSetTargets && <span className="text-xs text-muted-foreground">Target ditetapkan oleh manager atau HR.</span>}
      </div>
    </div>
  );
}

// TP-003 / TP-004 / TP-005
export function SkillSection({
  kind,
  ctx,
  catalog,
  perms,
  onChanged,
}: {
  kind: SkillKind;
  ctx: TalentContext;
  catalog: CatalogSkill[];
  perms: TalentPermissions;
  onChanged: () => void;
}) {
  const items = ctx.skills.filter((s) => s.kind === kind);
  const [editing, setEditing] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState("");
  const [newLevel, setNewLevel] = useState(3);
  const t = TITLES[kind];
  const available = catalog.filter((c) => c.kind === kind && !items.some((i) => i.skill_id === c.id));
  const evidenceCount = (id: string) => ctx.evidence.filter((e) => e.skill_id === id).length;

  async function run(fn: () => Promise<void>, ok?: string) {
    try {
      await fn();
      if (ok) toast.success(ok);
      onChanged();
    } catch (e) {
      toast.error(friendlyError(e as { message?: string; code?: string }));
    }
  }

  return (
    <Section title={t.title} description={t.description}>
      <div className="space-y-3">
        {items.length === 0 ? (
          <EmptyState>{t.empty}</EmptyState>
        ) : (
          <ul className="divide-y">
            {items.map((s) => {
              const current = toScore(s.level, s.score);
              const target = toScore(s.target_level, s.target_score);
              const g = gap(current, target);
              const src = SOURCE_LABELS[s.source] ?? SOURCE_LABELS.self;
              return (
                <li key={s.skill_id} className="space-y-2 py-3">
                  <div className="grid items-center gap-2 md:grid-cols-[minmax(10rem,1.3fr)_1fr_auto]">
                    <div className="min-w-0">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.category ?? "—"} · diperbarui {fmtDate(s.assessed_at)}
                        {kind === "expertise" && s.years_experience !== null && ` · ${s.years_experience} th pengalaman`}
                        {kind === "expertise" && s.last_used && ` · terakhir ${fmtDate(s.last_used)}`}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>
                          {levelLabel(s.level, ctx.level_scale)} {current !== null && `(${current})`}
                        </span>
                        <span className="text-muted-foreground">
                          target {s.target_level || s.target_score ? `${levelLabel(s.target_level, ctx.level_scale)} (${target})` : "—"}
                        </span>
                      </div>
                      <Bar current={current} target={target} />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
                      <Pill className={src.className}>{src.label}</Pill>
                      {s.confidence && <Pill className="border bg-background">keyakinan {s.confidence}</Pill>}
                      <Pill className="border bg-background">{evidenceCount(s.skill_id)} evidence</Pill>
                      {g !== null && g < 0 && <Pill className="bg-amber-100 text-amber-900">Perlu pengembangan ({g})</Pill>}
                      {s.is_certified && <Pill className="bg-emerald-100 text-emerald-900">Tersertifikasi</Pill>}
                      {perms.canAssess && editing !== s.skill_id && (
                        <>
                          <Button size="xs" variant="ghost" onClick={() => setEditing(s.skill_id)}>
                            Ubah
                          </Button>
                          {(perms.isSelf || perms.isHR) && (
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              aria-label={`Hapus ${s.name}`}
                              onClick={() =>
                                window.confirm(`Hapus ${s.name} dari profil?`) && run(() => removeAssessment(ctx.talent.id, s.skill_id))
                              }
                            >
                              <Trash2 />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {editing === s.skill_id && (
                    <EditRow
                      item={s}
                      kind={kind}
                      perms={perms}
                      scale={ctx.level_scale}
                      onDone={(patch) => {
                        setEditing(null);
                        if (patch) run(() => updateAssessment(ctx.talent.id, s.skill_id, patch), `${s.name} disimpan.`);
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {perms.canAssess && available.length > 0 && (
          <div className={cn("flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center")}>
            <select className={cn(inputClass, "sm:max-w-xs")} value={newSkill} onChange={(e) => setNewSkill(e.target.value)} aria-label={`Tambah ${t.title.toLowerCase()}`}>
              <option value="">Tambah {t.title.toLowerCase()}…</option>
              {available.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select className={cn(inputClass, "sm:max-w-48")} value={newLevel} onChange={(e) => setNewLevel(Number(e.target.value))} aria-label="Level">
              {ctx.level_scale.map((s) => (
                <option key={s.level} value={s.level}>
                  {s.level} · {s.label}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              disabled={!newSkill}
              onClick={() =>
                run(async () => {
                  await addAssessment(ctx.talent.id, newSkill, { level: newLevel });
                  setNewSkill("");
                })
              }
            >
              Tambah
            </Button>
          </div>
        )}
      </div>
    </Section>
  );
}
