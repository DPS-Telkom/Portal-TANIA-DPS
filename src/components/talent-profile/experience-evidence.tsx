"use client";

import { CheckCircle2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { friendlyError } from "@/lib/errors";
import type { TalentPermissions } from "@/lib/talent-profile/permissions";
import {
  addEvidence,
  deleteEvidence,
  deleteProject,
  saveProject,
  setEvidenceVerified,
  type ProjectInput,
} from "@/lib/talent-profile/service";
import type { TalentContext, TalentProject } from "@/lib/talent-profile/types";

import type { CatalogSkill } from "./skill-section";
import { EmptyState, Pill, Section, inputClass, textareaClass } from "./section";

const fmt = (d: string | null) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", { month: "short", year: "numeric" }) : "…";

export const EVIDENCE_TYPES: Record<string, string> = {
  project: "Project",
  certification: "Sertifikasi",
  assessment: "Assessment",
  training: "Training",
  publication: "Publikasi",
  position: "Posisi / role",
  manager_validation: "Validasi manager",
  other: "Lainnya",
};

async function attempt(fn: () => Promise<unknown>, ok: string, onChanged: () => void) {
  try {
    await fn();
    toast.success(ok);
    onChanged();
  } catch (e) {
    toast.error(friendlyError(e as { message?: string; code?: string }));
  }
}

function ProjectForm({
  profileId,
  catalog,
  initial,
  onDone,
}: {
  profileId: string;
  catalog: CatalogSkill[];
  initial?: TalentProject;
  onDone: (saved: boolean) => void;
}) {
  const [v, setV] = useState<ProjectInput>({
    name: initial?.name ?? "",
    role: initial?.role ?? "",
    organization: initial?.organization ?? "",
    domain: initial?.domain ?? "",
    start_date: initial?.start_date ?? "",
    end_date: initial?.end_date ?? "",
    responsibilities: initial?.responsibilities ?? "",
    outcomes: initial?.outcomes ?? "",
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof ProjectInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (v.name.trim().length < 2) return toast.error("Nama project wajib diisi.");
    if (v.start_date && v.end_date && v.end_date < v.start_date) return toast.error("Periode tidak valid.");
    setBusy(true);
    try {
      const clean = Object.fromEntries(
        Object.entries(v).map(([k, val]) => [k, typeof val === "string" ? val.trim() || null : val]),
      ) as ProjectInput;
      const id = await saveProject(profileId, { ...clean, name: v.name.trim() }, initial?.id);
      // Capabilities used → evidence rows linked to this project.
      for (const skillId of skills) {
        await addEvidence(profileId, {
          evidence_type: "project",
          title: v.name.trim(),
          description: [v.role, v.outcomes].filter(Boolean).join(" — ") || null,
          evidence_date: v.end_date || v.start_date || null,
          skill_id: skillId,
          talent_project_id: id,
        });
      }
      toast.success("Project disimpan.");
      onDone(true);
    } catch (err) {
      toast.error(friendlyError(err as { message?: string; code?: string }));
    } finally {
      setBusy(false);
    }
  }

  const f = (k: keyof ProjectInput, label: string, type = "text") => (
    <div className="space-y-1">
      <Label htmlFor={`p-${k}`}>{label}</Label>
      <Input id={`p-${k}`} type={type} value={(v[k] as string) ?? ""} onChange={set(k)} />
    </div>
  );

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-3">
      {f("name", "Nama project")}
      {f("role", "Peran")}
      {f("organization", "Organisasi / customer")}
      {f("domain", "Domain")}
      {f("start_date", "Mulai", "date")}
      {f("end_date", "Selesai", "date")}
      <div className="space-y-1 sm:col-span-2 lg:col-span-3">
        <Label htmlFor="p-resp">Tanggung jawab</Label>
        <textarea id="p-resp" className={textareaClass} value={v.responsibilities ?? ""} onChange={set("responsibilities")} />
      </div>
      <div className="space-y-1 sm:col-span-2 lg:col-span-3">
        <Label htmlFor="p-out">Outcome</Label>
        <textarea id="p-out" className={textareaClass} value={v.outcomes ?? ""} onChange={set("outcomes")} />
      </div>
      <fieldset className="space-y-1 sm:col-span-2 lg:col-span-3">
        <legend className="text-sm font-medium">Capability / kompetensi yang dipakai (menjadi evidence)</legend>
        <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
          {catalog.map((c) => {
            const on = skills.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => setSkills((s) => (on ? s.filter((x) => x !== c.id) : [...s, c.id]))}
                className={`rounded-full border px-2 py-0.5 text-xs ${on ? "border-telkom-red bg-telkom-red/10 text-telkom-red" : ""}`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan project"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onDone(false)}>
          Batal
        </Button>
      </div>
    </form>
  );
}

// TP-007 — project experience; projects become capability evidence.
export function ProjectExperience({ ctx, catalog, perms, onChanged }: { ctx: TalentContext; catalog: CatalogSkill[]; perms: TalentPermissions; onChanged: () => void }) {
  const [editing, setEditing] = useState<TalentProject | "new" | null>(null);

  return (
    <div className="space-y-6">
      <Section
        title="Experience & Projects"
        description="Pengalaman project, termasuk di luar TANIA. Capability yang dipakai tercatat sebagai evidence."
        actions={
          perms.canManageRecords && !editing ? (
            <Button size="sm" variant="outline" onClick={() => setEditing("new")}>
              Tambah project
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-3">
          {editing && (
            <ProjectForm
              profileId={ctx.talent.id}
              catalog={catalog}
              initial={editing === "new" ? undefined : editing}
              onDone={(saved) => {
                setEditing(null);
                if (saved) onChanged();
              }}
            />
          )}
          {ctx.projects.length === 0 ? (
            <EmptyState>Belum ada project experience.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {ctx.projects.map((p) => {
                const used = ctx.evidence.filter((e) => e.talent_project_id === p.id && e.skill);
                return (
                  <li key={p.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {[p.role, p.organization, p.domain].filter(Boolean).join(" · ") || "—"} · {fmt(p.start_date)} – {p.end_date ? fmt(p.end_date) : "sekarang"}
                        </div>
                      </div>
                      {perms.canManageRecords && (
                        <div className="flex gap-1">
                          <Button size="xs" variant="ghost" onClick={() => setEditing(p)}>
                            Ubah
                          </Button>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            aria-label={`Hapus ${p.name}`}
                            onClick={() => window.confirm(`Hapus project ${p.name}?`) && attempt(() => deleteProject(p.id), "Project dihapus.", onChanged)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      )}
                    </div>
                    {p.responsibilities && <p className="mt-2 text-sm whitespace-pre-line">{p.responsibilities}</p>}
                    {p.outcomes && (
                      <p className="mt-1 text-sm">
                        <span className="text-muted-foreground">Outcome: </span>
                        {p.outcomes}
                      </p>
                    )}
                    {used.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {used.map((e) => (
                          <Pill key={e.id} className="border bg-background">
                            {e.skill}
                            {e.verified && <CheckCircle2 className="ml-1 size-3 text-emerald-600" aria-label="terverifikasi" />}
                          </Pill>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Section>

      <Section title="Penugasan di TANIA" description="Dari register alokasi (Workload) — data sistem, bukan input talent.">
        {ctx.tania_assignments.length === 0 ? (
          <EmptyState>Belum ada alokasi project di TANIA.</EmptyState>
        ) : (
          <ul className="divide-y text-sm">
            {ctx.tania_assignments.map((a) => (
              <li key={a.project + a.first_month} className="flex justify-between gap-2 py-2">
                <span>{a.project}</span>
                <span className="text-muted-foreground">
                  {fmt(a.first_month)} – {fmt(a.last_month)} · rata-rata {a.avg_percent}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

// TP-013 — evidence register with manager/HR verification.
export function EvidencePanel({ ctx, catalog, perms, onChanged }: { ctx: TalentContext; catalog: CatalogSkill[]; perms: TalentPermissions; onChanged: () => void }) {
  const [v, setV] = useState({ evidence_type: "training", title: "", skill_id: "", evidence_date: "", url: "", description: "" });
  const [open, setOpen] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (v.title.trim().length < 2) return toast.error("Judul evidence wajib diisi.");
    if (v.url && !/^https:\/\//i.test(v.url)) return toast.error("URL harus diawali https://");
    await attempt(
      () =>
        addEvidence(ctx.talent.id, {
          evidence_type: v.evidence_type,
          title: v.title.trim(),
          skill_id: v.skill_id || null,
          evidence_date: v.evidence_date || null,
          url: v.url.trim() || null,
          description: v.description.trim() || null,
        }),
      "Evidence ditambahkan.",
      onChanged,
    );
    setOpen(false);
    setV({ ...v, title: "", url: "", description: "" });
  }

  return (
    <Section
      title="Evidence"
      description="Bukti yang mendukung penilaian capability: project, training, assessment, publikasi, validasi manager. Verifikasi oleh manager atau HR."
      actions={
        perms.canDevelop && !open ? (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            Tambah evidence
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-3">
        {open && (
          <form onSubmit={submit} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1 text-sm">
              Jenis
              <select className={inputClass} value={v.evidence_type} onChange={(e) => setV({ ...v, evidence_type: e.target.value })}>
                {Object.entries(EVIDENCE_TYPES).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              Judul
              <Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
            </label>
            <label className="space-y-1 text-sm">
              Capability / kompetensi
              <select className={inputClass} value={v.skill_id} onChange={(e) => setV({ ...v, skill_id: e.target.value })}>
                <option value="">—</option>
                {catalog.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.kind})
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              Tanggal
              <Input type="date" value={v.evidence_date} onChange={(e) => setV({ ...v, evidence_date: e.target.value })} />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              URL (opsional)
              <Input type="url" placeholder="https://" value={v.url} onChange={(e) => setV({ ...v, url: e.target.value })} />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2 lg:col-span-3">
              Keterangan
              <textarea className={textareaClass} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
            </label>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
              <Button type="submit" size="sm">
                Simpan evidence
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
                Batal
              </Button>
            </div>
          </form>
        )}
        {ctx.evidence.length === 0 ? (
          <EmptyState>Belum ada evidence.</EmptyState>
        ) : (
          <ul className="divide-y text-sm">
            {ctx.evidence.map((e) => (
              <li key={e.id} className="flex flex-wrap items-start justify-between gap-2 py-2">
                <div className="min-w-0">
                  <div className="font-medium">
                    {e.title}
                    {e.url && (
                      <a className="ml-2 text-xs text-telkom-red underline" href={e.url} target="_blank" rel="noopener noreferrer">
                        tautan
                      </a>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {EVIDENCE_TYPES[e.type] ?? e.type}
                    {e.skill ? ` · ${e.skill}` : ""}
                    {e.date ? ` · ${new Date(`${e.date}T00:00:00`).toLocaleDateString("id-ID", { dateStyle: "medium" })}` : ""}
                  </div>
                  {e.description && <p className="text-xs">{e.description}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Pill className={e.verified ? "bg-emerald-100 text-emerald-900" : "bg-neutral-100 text-neutral-700"}>
                    {e.verified ? "Terverifikasi" : "Belum diverifikasi"}
                  </Pill>
                  {perms.canVerifyEvidence && (
                    <Button size="xs" variant="ghost" onClick={() => attempt(() => setEvidenceVerified(e.id, !e.verified), e.verified ? "Verifikasi dibatalkan." : "Evidence terverifikasi.", onChanged)}>
                      {e.verified ? "Batalkan" : "Verifikasi"}
                    </Button>
                  )}
                  {perms.canDevelop && (
                    <Button size="icon-xs" variant="ghost" aria-label={`Hapus evidence ${e.title}`} onClick={() => window.confirm("Hapus evidence ini?") && attempt(() => deleteEvidence(e.id), "Evidence dihapus.", onChanged)}>
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
