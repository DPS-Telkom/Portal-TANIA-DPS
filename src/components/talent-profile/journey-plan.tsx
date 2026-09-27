"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { friendlyError } from "@/lib/errors";
import { recommendJourney, type TalentJourney } from "@/lib/talent-profile/ai";
import { planProgress } from "@/lib/talent-profile/calc";
import type { TalentPermissions } from "@/lib/talent-profile/permissions";
import { addActivity, createPlan, setActivityStatus, setPlanStatus } from "@/lib/talent-profile/service";
import type { ActivityStatus, ActivityType, DevelopmentPlan, TalentContext } from "@/lib/talent-profile/types";

import { ClassifiedAnswer } from "./classified";
import type { CatalogSkill } from "./skill-section";
import { EmptyState, Pill, Section, inputClass } from "./section";

const TYPE_LABELS: Record<ActivityType, string> = {
  learning: "Learning",
  certification: "Sertifikasi",
  project: "Project assignment",
  mentoring: "Mentoring",
  assessment: "Assessment",
  milestone: "Milestone",
  other: "Lainnya",
};

const STATUS_LABELS: Record<ActivityStatus, string> = {
  planned: "Direncanakan",
  in_progress: "Berjalan",
  completed: "Selesai",
  skipped: "Dilewati",
};

function addMonthsISO(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

// TP-010 — AI drafts; the user decides whether it becomes a plan.
export function RecommendedJourney({
  ctx,
  catalog,
  perms,
  onChanged,
}: {
  ctx: TalentContext;
  catalog: CatalogSkill[];
  perms: TalentPermissions;
  onChanged: () => void;
}) {
  const [target, setTarget] = useState("");
  const [journey, setJourney] = useState<TalentJourney | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      setJourney(await recommendJourney(ctx.talent.id, target.trim() || undefined));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rekomendasi tidak tersedia.");
    } finally {
      setBusy(false);
    }
  }

  async function saveAsPlan() {
    if (!journey) return;
    setSaving(true);
    try {
      const skillId = (name: string | null) =>
        name ? catalog.find((c) => c.name.toLowerCase() === name.toLowerCase())?.id ?? null : null;
      await createPlan(
        ctx.talent.id,
        {
          title: `Journey: ${journey.target_role}`,
          objective: journey.objective,
          target_role: journey.target_role,
          start_date: new Date().toISOString().slice(0, 10),
          due_date: addMonthsISO(journey.duration_months),
          origin: "ai_recommendation",
        },
        journey.steps.map((s) => ({
          title: s.title,
          activity_type: s.activity_type,
          month_index: s.month,
          skill_id: skillId(s.skill),
          due_date: addMonthsISO(s.month),
        })),
      );
      toast.success("Development plan dibuat dari rekomendasi.");
      setJourney(null);
      onChanged();
    } catch (e) {
      toast.error(friendlyError(e as { message?: string; code?: string }));
    } finally {
      setSaving(false);
    }
  }

  const months = journey ? [...new Set(journey.steps.map((s) => s.month))].sort((a, b) => a - b) : [];

  return (
    <Section
      title="Recommended Journey"
      description="Rekomendasi AI berdasarkan role, capability, competency, experience, performance, dan gap. Rekomendasi tidak mengubah data HR, jabatan, atau performance."
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Target role / capability (opsional), mis. AI Product Leader"
            value={target}
            maxLength={200}
            onChange={(e) => setTarget(e.target.value)}
            aria-label="Target role"
          />
          <Button onClick={generate} disabled={busy} className="shrink-0 gap-1">
            <Sparkles className="size-4" /> {busy ? "Menyusun…" : "Susun rekomendasi"}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {journey && (
          <div className="space-y-4 rounded-lg border p-4">
            <div>
              <div className="text-xs text-muted-foreground uppercase">Target</div>
              <div className="text-lg font-semibold">{journey.target_role}</div>
              <p className="text-sm">{journey.objective}</p>
              <p className="text-xs text-muted-foreground">Durasi {journey.duration_months} bulan</p>
            </div>
            <ol className="space-y-3 border-l-2 pl-4">
              {months.map((m) => (
                <li key={m}>
                  <div className="text-xs font-semibold text-telkom-red">Bulan {m}</div>
                  <ul className="mt-1 space-y-1">
                    {journey.steps
                      .filter((s) => s.month === m)
                      .map((s, i) => (
                        <li key={i} className="text-sm">
                          <Pill className="mr-1 border bg-background">{TYPE_LABELS[s.activity_type]}</Pill>
                          <span className="font-medium">{s.title}</span>
                          {s.skill && <span className="text-muted-foreground"> · {s.skill}</span>}
                          <span className="block text-xs text-muted-foreground">{s.rationale}</span>
                        </li>
                      ))}
                  </ul>
                </li>
              ))}
            </ol>
            <details>
              <summary className="cursor-pointer text-sm text-muted-foreground">Dasar rekomendasi (FACT / INFERENCE / UNKNOWN)</summary>
              <ClassifiedAnswer data={journey} className="mt-2" />
            </details>
            {perms.canDevelop ? (
              <Button onClick={saveAsPlan} disabled={saving}>
                {saving ? "Menyimpan…" : "Jadikan development plan"}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">Hanya talent, atasan, Chapter Leader, atau HR yang dapat menyimpan plan.</p>
            )}
          </div>
        )}
      </div>
    </Section>
  );
}

function PlanCard({ plan, perms, onChanged }: { plan: DevelopmentPlan; perms: TalentPermissions; onChanged: () => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ActivityType>("learning");
  const progress = planProgress(plan.activities);

  async function run(fn: () => Promise<void>) {
    try {
      await fn();
      onChanged();
    } catch (e) {
      toast.error(friendlyError(e as { message?: string; code?: string }));
    }
  }

  return (
    <li className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold">{plan.title}</div>
          <div className="text-xs text-muted-foreground">
            {plan.objective ?? "—"}
            {plan.due_date && ` · target ${new Date(`${plan.due_date}T00:00:00`).toLocaleDateString("id-ID", { dateStyle: "medium" })}`}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {plan.origin === "ai_recommendation" && <Pill className="bg-violet-100 text-violet-900">Dari rekomendasi AI</Pill>}
          {perms.canDevelop ? (
            <select
              className="h-7 rounded-md border bg-background px-1 text-xs"
              value={plan.status}
              aria-label="Status plan"
              onChange={(e) => run(() => setPlanStatus(plan.id, e.target.value as DevelopmentPlan["status"]))}
            >
              <option value="draft">Draft</option>
              <option value="active">Aktif</option>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          ) : (
            <Pill className="border bg-background">{plan.status}</Pill>
          )}
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs">
          <span>Progress</span>
          <span>{progress === null ? "—" : `${progress}%`}</span>
        </div>
        <div className="mt-1 h-2 rounded-full bg-muted" role="progressbar" aria-valuenow={progress ?? 0} aria-label={`Progress ${plan.title}`}>
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress ?? 0}%` }} />
        </div>
      </div>
      {plan.activities.length === 0 ? (
        <EmptyState>Belum ada aktivitas.</EmptyState>
      ) : (
        <ul className="divide-y text-sm">
          {plan.activities.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                {a.month_index && <span className="mr-2 text-xs font-semibold text-telkom-red">Bulan {a.month_index}</span>}
                <span className={a.status === "completed" ? "line-through opacity-70" : ""}>{a.title}</span>
                <span className="ml-2 text-xs text-muted-foreground">{TYPE_LABELS[a.type]}</span>
                {a.completed_at && (
                  <span className="block text-xs text-muted-foreground">
                    Selesai {new Date(a.completed_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                  </span>
                )}
              </div>
              {perms.canDevelop ? (
                <select
                  className="h-7 rounded-md border bg-background px-1 text-xs"
                  value={a.status}
                  aria-label={`Status ${a.title}`}
                  onChange={(e) => run(() => setActivityStatus(a.id, e.target.value as ActivityStatus))}
                >
                  {Object.entries(STATUS_LABELS).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              ) : (
                <Pill className="border bg-background">{STATUS_LABELS[a.status]}</Pill>
              )}
            </li>
          ))}
        </ul>
      )}
      {perms.canDevelop && (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim().length < 2) return;
            run(async () => {
              await addActivity(plan.id, { title: title.trim(), activity_type: type, sort_order: plan.activities.length });
              setTitle("");
            });
          }}
        >
          <Input value={title} placeholder="Tambah aktivitas…" onChange={(e) => setTitle(e.target.value)} aria-label="Aktivitas baru" />
          <select className={`${inputClass} sm:max-w-44`} value={type} onChange={(e) => setType(e.target.value as ActivityType)} aria-label="Jenis aktivitas">
            {Object.entries(TYPE_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" variant="outline">
            Tambah
          </Button>
        </form>
      )}
    </li>
  );
}

// TP-011 — development plans with progress tracking.
export function DevelopmentPlans({ ctx, perms, onChanged }: { ctx: TalentContext; perms: TalentPermissions; onChanged: () => void }) {
  const [title, setTitle] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 3) return toast.error("Judul plan minimal 3 karakter.");
    try {
      await createPlan(ctx.talent.id, { title: title.trim(), origin: "manual", start_date: new Date().toISOString().slice(0, 10) }, []);
      setTitle("");
      onChanged();
    } catch (err) {
      toast.error(friendlyError(err as { message?: string; code?: string }));
    }
  }

  return (
    <Section title="Development Plan" description="Status, progress, tanggal, dan evidence setiap aktivitas pengembangan.">
      <div className="space-y-4">
        {perms.canDevelop && (
          <form onSubmit={create} className="flex flex-col gap-2 sm:flex-row">
            <Input value={title} placeholder="Judul development plan baru" onChange={(e) => setTitle(e.target.value)} aria-label="Judul plan" />
            <Button type="submit" variant="outline" className="shrink-0">
              Buat plan
            </Button>
          </form>
        )}
        {ctx.development_plans.length === 0 ? (
          <EmptyState>Belum ada development plan. Susun rekomendasi di atas, lalu jadikan plan.</EmptyState>
        ) : (
          <ul className="space-y-3">
            {ctx.development_plans.map((p) => (
              <PlanCard key={p.id} plan={p} perms={perms} onChanged={onChanged} />
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
