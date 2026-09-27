"use client";

import { Camera, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { friendlyError } from "@/lib/errors";
import { ROLE_LABELS } from "@/lib/roles";
import { talentInsight, type TalentInsight } from "@/lib/talent-profile/ai";
import { experienceYears, summarize } from "@/lib/talent-profile/calc";
import type { TalentPermissions } from "@/lib/talent-profile/permissions";
import { signedTalentFileUrl, updateIdentity, uploadTalentFile, type IdentityPatch } from "@/lib/talent-profile/service";
import type { TalentContext } from "@/lib/talent-profile/types";
import type { UserRole } from "@/lib/types";

import { ClassifiedAnswer } from "./classified";
import { Pill } from "./section";

const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d: string | null) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", { dateStyle: "medium" }) : "—");

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function SummaryCard({ label, value, detail }: { label: string; value: string | null; detail: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value ?? <span className="text-base font-normal text-muted-foreground">—</span>}</div>
      <div className="text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

function IdentityForm({ ctx, perms, onSaved, onCancel }: { ctx: TalentContext; perms: TalentPermissions; onSaved: () => void; onCancel: () => void }) {
  const t = ctx.talent;
  const [v, setV] = useState({
    full_name: t.full_name ?? "",
    location: t.location ?? "",
    squad: t.squad ?? "",
    grade: t.grade ?? "",
    employee_id: t.employee_id ?? "",
    position_title: t.position_title ?? "",
    organization: t.organization ?? "",
    career_level: t.career_level ?? "",
    join_date: t.join_date ?? "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((x) => ({ ...x, [k]: e.target.value }));
  const nn = (s: string) => s.trim() || null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const patch: IdentityPatch = {};
    if (perms.canEditPersonal) {
      if (v.full_name.trim().length < 2) return toast.error("Nama wajib diisi.");
      patch.full_name = v.full_name.trim();
      patch.location = nn(v.location);
    }
    if (perms.canEditOrg) Object.assign(patch, { squad: nn(v.squad), grade: nn(v.grade) });
    if (perms.canEditWork)
      Object.assign(patch, {
        employee_id: nn(v.employee_id),
        position_title: nn(v.position_title),
        organization: nn(v.organization),
        career_level: nn(v.career_level),
        join_date: v.join_date || null,
      });
    setBusy(true);
    try {
      await updateIdentity(t.id, patch);
      toast.success("Profil disimpan.");
      onSaved();
    } catch (err) {
      toast.error(friendlyError(err as { message?: string; code?: string }));
    } finally {
      setBusy(false);
    }
  }

  const field = (k: keyof typeof v, label: string, type = "text") => (
    <div className="space-y-1">
      <Label htmlFor={`id-${k}`}>{label}</Label>
      <Input id={`id-${k}`} type={type} value={v[k]} onChange={set(k)} maxLength={200} />
    </div>
  );

  return (
    <form onSubmit={save} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-3">
      {perms.canEditPersonal && (
        <>
          {field("full_name", "Nama lengkap")}
          {field("location", "Lokasi")}
        </>
      )}
      {perms.canEditWork && (
        <>
          {field("employee_id", "Employee ID")}
          {field("position_title", "Posisi saat ini")}
          {field("organization", "Organisasi")}
          {field("career_level", "Career level")}
          {field("join_date", "Tanggal bergabung", "date")}
        </>
      )}
      {perms.canEditOrg && (
        <>
          {field("squad", "Squad")}
          {field("grade", "Grade")}
        </>
      )}
      {!perms.canEditWork && (
        <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-3">
          Employee ID, posisi, organisasi, career level, dan tanggal bergabung dikelola HR.
        </p>
      )}
      <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Batal
        </Button>
      </div>
    </form>
  );
}

function AiInsight({ profileId }: { profileId: string }) {
  const [insight, setInsight] = useState<TalentInsight | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function run(force: boolean) {
    setBusy(true);
    setNote(null);
    try {
      const res = await talentInsight(profileId, force);
      setInsight(res.insight);
      if (res.notice) setNote(res.notice);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Insight tidak tersedia.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-telkom-red/30 bg-telkom-red/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-telkom-red uppercase">
          <Sparkles className="size-3.5" /> AI Insight
        </span>
        {insight ? (
          <Button variant="ghost" size="xs" onClick={() => run(true)} disabled={busy} aria-label="Perbarui AI Insight">
            <RefreshCw className={busy ? "animate-spin" : ""} /> Perbarui
          </Button>
        ) : (
          <Button variant="outline" size="xs" onClick={() => run(false)} disabled={busy}>
            {busy ? "Menganalisis…" : "Buat insight"}
          </Button>
        )}
      </div>
      {insight ? (
        <div className="mt-2 space-y-2">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Capability terkuat</dt>
              <dd className="font-medium">{insight.strongest_capability ?? "Data belum tersedia"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Fokus pengembangan</dt>
              <dd className="font-medium">{insight.development_focus ?? "Data belum tersedia"}</dd>
            </div>
          </dl>
          <details className="text-sm">
            <summary className="cursor-pointer text-xs text-muted-foreground">Lihat dasar insight (FACT / INFERENCE / …)</summary>
            <ClassifiedAnswer data={insight} className="mt-2" />
          </details>
        </div>
      ) : (
        !note && <p className="mt-1 text-xs text-muted-foreground">Insight dibuat oleh AI dari data profil ini, atas permintaan Anda.</p>
      )}
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

export function TalentHeader({ ctx, perms, onChanged }: { ctx: TalentContext; perms: TalentPermissions; onChanged: () => void }) {
  const t = ctx.talent;
  const summary = summarize(ctx);
  const years = experienceYears(ctx.career_history, t.join_date, today());
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    if (t.photo_path) signedTalentFileUrl(t.photo_path).then((u) => alive && setPhotoUrl(u));
    else setPhotoUrl(null);
    return () => {
      alive = false;
    };
  }, [t.photo_path]);

  async function uploadPhoto(file: File) {
    setUploading(true);
    try {
      const path = await uploadTalentFile("photos", t.id, file);
      await updateIdentity(t.id, { photo_path: path });
      toast.success("Foto diperbarui.");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error && !("code" in e) ? e.message : friendlyError(e as { message?: string }));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const canPhoto = perms.canEditPersonal || perms.canEditWork;
  const facts: [string, string][] = [
    ["Employee ID", t.employee_id ?? "—"],
    ["Organisasi", t.organization ?? "—"],
    ["Career level", t.career_level ?? "—"],
    ["Manager", t.manager?.full_name ?? "—"],
    ["Pengalaman", years === null ? "Data belum tersedia" : `${years.toLocaleString("id-ID")} tahun`],
    ["Bergabung", fmtDate(t.join_date)],
    ["Squad / grade", [t.squad, t.grade].filter(Boolean).join(" · ") || "—"],
    ["Status", t.is_active ? "Aktif" : "Nonaktif"],
  ];

  return (
    <section aria-label="Ringkasan talent" className="space-y-4 rounded-xl border bg-background p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative size-20 shrink-0">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed private URL, static export
            <img src={photoUrl} alt={`Foto ${t.full_name}`} className="size-20 rounded-full border object-cover" />
          ) : (
            <div className="grid size-20 place-items-center rounded-full bg-telkom-red/10 text-xl font-semibold text-telkom-red" aria-hidden>
              {initials(t.full_name || "?")}
            </div>
          )}
          {canPhoto && (
            <>
              <button
                type="button"
                className="absolute -right-1 -bottom-1 grid size-7 place-items-center rounded-full border bg-background shadow-sm hover:text-telkom-red"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                aria-label="Ganti foto profil"
              >
                <Camera className="size-3.5" />
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
              />
            </>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{t.full_name || t.email}</h1>
            {t.is_demo && <Pill className="bg-amber-200 text-amber-950">DATA DEMO</Pill>}
            <Pill className="bg-muted">{ROLE_LABELS[t.role as UserRole] ?? t.role}</Pill>
          </div>
          <p className="text-muted-foreground">{t.position_title ?? "Posisi belum diisi HR"}</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm lg:grid-cols-4">
            {facts.map(([k, val]) => (
              <div key={k} className="min-w-0">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="truncate">{val}</dd>
              </div>
            ))}
          </dl>
        </div>
        {(perms.canEditPersonal || perms.canEditWork || perms.canEditOrg) && !editing && (
          <Button variant="outline" size="sm" className="self-start" onClick={() => setEditing(true)}>
            Ubah profil
          </Button>
        )}
      </div>

      {editing && (
        <IdentityForm
          ctx={ctx}
          perms={perms}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onChanged();
          }}
        />
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          label="Capability"
          value={summary.capability === null ? null : `${summary.capability}`}
          detail={summary.capability === null ? "Assessment belum dilakukan" : "Rata-rata skor 0–100"}
        />
        <SummaryCard
          label="Expertise"
          value={summary.expertise === null ? null : `${summary.expertise}`}
          detail={summary.expertise === null ? "Assessment belum dilakukan" : "Rata-rata skor 0–100"}
        />
        <SummaryCard
          label="Sertifikasi"
          value={summary.certification ? `${summary.certification.active}/${summary.certification.total}` : null}
          detail={summary.certification ? "Aktif / total" : "Data belum tersedia"}
        />
        <SummaryCard
          label="Performance"
          value={summary.performance?.score === null || !summary.performance ? null : `${summary.performance.score}`}
          detail={summary.performance ? `Tahun ${summary.performance.year}` : "Performance history belum tersedia"}
        />
      </div>

      <AiInsight profileId={t.id} />
    </section>
  );
}
