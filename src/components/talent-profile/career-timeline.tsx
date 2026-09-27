"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { friendlyError } from "@/lib/errors";
import { inPeriod } from "@/lib/talent-profile/calc";
import type { TalentPermissions } from "@/lib/talent-profile/permissions";
import { deletePosition, savePosition, type PositionInput } from "@/lib/talent-profile/service";
import type { CareerPosition, TalentContext } from "@/lib/talent-profile/types";
import { cn } from "@/lib/utils";

import { EmptyState, Pill, Section, textareaClass } from "./section";

const fmt = (d: string | null) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", { month: "short", year: "numeric" }) : "sekarang";

function duration(start: string, end: string | null) {
  const [y1, m1] = start.split("-").map(Number);
  const e = end ?? new Date().toISOString().slice(0, 10);
  const [y2, m2] = e.split("-").map(Number);
  const months = Math.max(0, (y2 - y1) * 12 + (m2 - m1));
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y && `${y} th`, m && `${m} bln`].filter(Boolean).join(" ") || "< 1 bln";
}

function PositionForm({ initial, onSubmit, onCancel }: { initial?: CareerPosition; onSubmit: (v: PositionInput) => Promise<void>; onCancel: () => void }) {
  const [v, setV] = useState<PositionInput>({
    position_title: initial?.position_title ?? "",
    organization: initial?.organization ?? "",
    start_date: initial?.start_date ?? "",
    end_date: initial?.end_date ?? "",
    responsibilities: initial?.responsibilities ?? "",
    achievements: initial?.achievements ?? "",
  });
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (v.position_title.trim().length < 2 || !v.start_date) return toast.error("Posisi dan tanggal mulai wajib diisi.");
    if (v.end_date && v.end_date < v.start_date) return toast.error("Tanggal selesai tidak boleh sebelum tanggal mulai.");
    setBusy(true);
    await onSubmit({
      position_title: v.position_title.trim(),
      organization: v.organization?.trim() || null,
      start_date: v.start_date,
      end_date: v.end_date || null,
      responsibilities: v.responsibilities?.trim() || null,
      achievements: v.achievements?.trim() || null,
    });
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
      <div className="space-y-1">
        <Label htmlFor="pos-title">Posisi</Label>
        <Input id="pos-title" value={v.position_title} onChange={(e) => setV({ ...v, position_title: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="pos-org">Organisasi</Label>
        <Input id="pos-org" value={v.organization ?? ""} onChange={(e) => setV({ ...v, organization: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="pos-start">Mulai</Label>
        <Input id="pos-start" type="date" value={v.start_date} onChange={(e) => setV({ ...v, start_date: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="pos-end">Selesai (kosong = saat ini)</Label>
        <Input id="pos-end" type="date" value={v.end_date ?? ""} onChange={(e) => setV({ ...v, end_date: e.target.value })} />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="pos-resp">Tanggung jawab</Label>
        <textarea id="pos-resp" className={textareaClass} value={v.responsibilities ?? ""} onChange={(e) => setV({ ...v, responsibilities: e.target.value })} />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="pos-ach">Pencapaian utama</Label>
        <textarea id="pos-ach" className={textareaClass} value={v.achievements ?? ""} onChange={(e) => setV({ ...v, achievements: e.target.value })} />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="sm" disabled={busy}>
          Simpan posisi
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Batal
        </Button>
      </div>
    </form>
  );
}

function NodeDetail({ pos, ctx }: { pos: CareerPosition; ctx: TalentContext }) {
  const projects = ctx.projects.filter((p) => inPeriod(p.start_date, pos.start_date, pos.end_date));
  const certs = ctx.certifications.filter((c) => inPeriod(c.issued_on, pos.start_date, pos.end_date));
  const projectIds = new Set(projects.map((p) => p.id));
  const capabilities = [
    ...new Set(
      ctx.evidence
        .filter((e) => e.skill && (e.position_id === pos.id || (e.talent_project_id && projectIds.has(e.talent_project_id))))
        .map((e) => e.skill as string),
    ),
  ];
  const startYear = Number(pos.start_date.slice(0, 4));
  const endYear = pos.end_date ? Number(pos.end_date.slice(0, 4)) : new Date().getFullYear();
  const perf = ctx.performance_history.filter((r) => r.period_year >= startYear && r.period_year <= endYear);

  const block = (title: string, content: React.ReactNode) => (
    <div>
      <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h4>
      <div className="mt-1 text-sm">{content}</div>
    </div>
  );
  const none = <span className="text-muted-foreground">Data belum tersedia</span>;

  return (
    <div className="grid gap-4 rounded-lg border bg-muted/20 p-4 md:grid-cols-2">
      {block("Tanggung jawab", pos.responsibilities ? <p className="whitespace-pre-line">{pos.responsibilities}</p> : none)}
      {block("Pencapaian", pos.achievements ? <p className="whitespace-pre-line">{pos.achievements}</p> : none)}
      {block(
        "Project pada periode ini",
        projects.length ? (
          <ul className="list-disc pl-4">
            {projects.map((p) => (
              <li key={p.id}>
                {p.name}
                {p.role ? ` — ${p.role}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          none
        ),
      )}
      {block(
        "Capability yang diperoleh (dari evidence)",
        capabilities.length ? (
          <div className="flex flex-wrap gap-1">
            {capabilities.map((c) => (
              <Pill key={c} className="border bg-background">
                {c}
              </Pill>
            ))}
          </div>
        ) : (
          none
        ),
      )}
      {block("Sertifikasi", certs.length ? certs.map((c) => c.name).join(", ") : none)}
      {block(
        "Performance",
        perf.length ? perf.map((r) => `${r.period_year}: ${r.overall_score ?? "—"}`).join(" · ") : <span className="text-muted-foreground">Performance history belum tersedia</span>,
      )}
    </div>
  );
}

// TP-002 — career history as an interactive timeline; HR maintains it.
export function CareerTimeline({ ctx, perms, onChanged }: { ctx: TalentContext; perms: TalentPermissions; onChanged: () => void }) {
  const positions = [...ctx.career_history].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const [selected, setSelected] = useState<string | null>(positions.at(-1)?.id ?? null);
  const [editing, setEditing] = useState<CareerPosition | "new" | null>(null);
  const current = positions.find((p) => p.id === selected);

  async function submit(v: PositionInput) {
    try {
      await savePosition(ctx.talent.id, v, editing && editing !== "new" ? editing.id : undefined);
      toast.success("Riwayat karier disimpan.");
      setEditing(null);
      onChanged();
    } catch (e) {
      toast.error(friendlyError(e as { message?: string; code?: string }));
    }
  }

  async function remove(p: CareerPosition) {
    if (!window.confirm(`Hapus posisi "${p.position_title}"? Tercatat di audit log.`)) return;
    try {
      await deletePosition(p.id);
      onChanged();
    } catch (e) {
      toast.error(friendlyError(e as { message?: string; code?: string }));
    }
  }

  return (
    <Section
      title="Career & Talent Journey"
      description="Riwayat posisi dari sumber HR. Pilih satu posisi untuk melihat project, capability, sertifikasi, dan performance pada periodenya."
      actions={
        perms.canEditCareer && !editing ? (
          <Button size="sm" variant="outline" onClick={() => setEditing("new")}>
            Tambah posisi
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {editing && (
          <PositionForm initial={editing === "new" ? undefined : editing} onSubmit={submit} onCancel={() => setEditing(null)} />
        )}
        {positions.length === 0 ? (
          <EmptyState>Riwayat karier belum tersedia. {perms.canEditCareer ? "Tambahkan posisi pertama." : "Data dikelola oleh HR."}</EmptyState>
        ) : (
          <>
            <ol className="flex gap-2 overflow-x-auto pb-2" aria-label="Timeline karier">
              {positions.map((p, i) => (
                <li key={p.id} className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelected(p.id)}
                    aria-pressed={selected === p.id}
                    className={cn(
                      "w-44 rounded-lg border p-3 text-left transition-colors hover:border-telkom-red focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      selected === p.id && "border-telkom-red bg-telkom-red/5",
                    )}
                  >
                    <div className="text-xs text-muted-foreground">
                      {fmt(p.start_date)} – {fmt(p.end_date)}
                    </div>
                    <div className="mt-0.5 line-clamp-2 text-sm font-semibold">{p.position_title}</div>
                    <div className="truncate text-xs text-muted-foreground">{p.organization ?? "—"}</div>
                    <div className="mt-1 text-xs">{duration(p.start_date, p.end_date)}</div>
                  </button>
                  {i < positions.length - 1 && <span aria-hidden className="text-muted-foreground">→</span>}
                </li>
              ))}
            </ol>
            {current && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">
                    {current.position_title}
                    {!current.end_date && <Pill className="ml-2 bg-emerald-100 text-emerald-900">Saat ini</Pill>}
                  </h3>
                  {perms.canEditCareer && (
                    <div className="flex gap-1">
                      <Button size="xs" variant="ghost" onClick={() => setEditing(current)}>
                        Ubah
                      </Button>
                      <Button size="icon-xs" variant="ghost" aria-label="Hapus posisi" onClick={() => remove(current)}>
                        <Trash2 />
                      </Button>
                    </div>
                  )}
                </div>
                <NodeDetail pos={current} ctx={ctx} />
              </div>
            )}
          </>
        )}
      </div>
    </Section>
  );
}
