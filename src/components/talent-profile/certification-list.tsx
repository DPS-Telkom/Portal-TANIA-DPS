"use client";

import { FileText, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { friendlyError } from "@/lib/errors";
import type { TalentPermissions } from "@/lib/talent-profile/permissions";
import {
  deleteCertification,
  saveCertification,
  setCertificationVerification,
  signedTalentFileUrl,
  uploadTalentFile,
} from "@/lib/talent-profile/service";
import type { CertificationStatus, TalentContext } from "@/lib/talent-profile/types";

import type { CatalogSkill } from "./skill-section";
import { EmptyState, Pill, Section, inputClass } from "./section";

export const CERT_STATUS: Record<CertificationStatus, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-emerald-100 text-emerald-900" },
  EXPIRING: { label: "Expiring", className: "bg-amber-100 text-amber-900" },
  EXPIRED: { label: "Expired", className: "bg-red-100 text-red-900" },
  PENDING_VERIFICATION: { label: "Pending verification", className: "bg-neutral-200 text-neutral-800" },
  REJECTED: { label: "Ditolak HR", className: "bg-red-100 text-red-900" },
};

const fmt = (d: string | null) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", { dateStyle: "medium" }) : "—");

function CertForm({ profileId, catalog, onSaved, onCancel }: { profileId: string; catalog: CatalogSkill[]; onSaved: () => void; onCancel: () => void }) {
  const [v, setV] = useState({ name: "", issuer: "", credential_id: "", issued_on: "", expires_on: "", url: "", skill_id: "" });
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (v.name.trim().length < 2) return toast.error("Nama sertifikasi wajib diisi.");
    if (v.issued_on && v.expires_on && v.expires_on < v.issued_on) return toast.error("Tanggal kedaluwarsa sebelum tanggal terbit.");
    if (v.url && !/^https:\/\//i.test(v.url)) return toast.error("URL sertifikat harus diawali https://");
    setBusy(true);
    try {
      const f = file.current?.files?.[0];
      const file_path = f ? await uploadTalentFile("certificates", profileId, f) : null;
      await saveCertification(profileId, {
        name: v.name.trim(),
        issuer: v.issuer.trim() || null,
        credential_id: v.credential_id.trim() || null,
        issued_on: v.issued_on || null,
        expires_on: v.expires_on || null,
        url: v.url.trim() || null,
        skill_id: v.skill_id || null,
        file_path,
      });
      toast.success("Sertifikasi ditambahkan — menunggu verifikasi HR.");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error && !("code" in err) ? err.message : friendlyError(err as { message?: string }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1">
        <Label htmlFor="c-name">Nama sertifikasi</Label>
        <Input id="c-name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="c-issuer">Penerbit</Label>
        <Input id="c-issuer" value={v.issuer} onChange={(e) => setV({ ...v, issuer: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="c-cred">Credential ID</Label>
        <Input id="c-cred" value={v.credential_id} onChange={(e) => setV({ ...v, credential_id: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="c-issued">Tanggal terbit</Label>
        <Input id="c-issued" type="date" value={v.issued_on} onChange={(e) => setV({ ...v, issued_on: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="c-exp">Kedaluwarsa</Label>
        <Input id="c-exp" type="date" value={v.expires_on} onChange={(e) => setV({ ...v, expires_on: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="c-skill">Terkait capability/kompetensi</Label>
        <select id="c-skill" className={inputClass} value={v.skill_id} onChange={(e) => setV({ ...v, skill_id: e.target.value })}>
          <option value="">—</option>
          {catalog.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.kind})
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="c-url">URL verifikasi (opsional)</Label>
        <Input id="c-url" type="url" placeholder="https://" value={v.url} onChange={(e) => setV({ ...v, url: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="c-file">File sertifikat (PDF/gambar, ≤5 MB)</Label>
        <input id="c-file" ref={file} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="text-sm" />
      </div>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan sertifikasi"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Batal
        </Button>
      </div>
    </form>
  );
}

// TP-006 — status is computed by the database from expiry + HR verification.
export function CertificationList({ ctx, catalog, perms, onChanged }: { ctx: TalentContext; catalog: CatalogSkill[]; perms: TalentPermissions; onChanged: () => void }) {
  const [adding, setAdding] = useState(false);
  const certs = ctx.certifications;
  const expiring = certs.filter((c) => c.status === "EXPIRING" || c.status === "EXPIRED");

  async function run(fn: () => Promise<void>, ok: string) {
    try {
      await fn();
      toast.success(ok);
      onChanged();
    } catch (e) {
      toast.error(friendlyError(e as { message?: string; code?: string }));
    }
  }

  async function openFile(path: string) {
    const url = await signedTalentFileUrl(path, 60);
    if (url) window.open(url, "_blank", "noopener");
    else toast.error("File tidak dapat dibuka.");
  }

  return (
    <Section
      title="Sertifikasi"
      description="Status dihitung otomatis dari tanggal kedaluwarsa dan verifikasi HR."
      actions={
        perms.canManageRecords && !adding ? (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            Tambah sertifikasi
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-3">
        {expiring.length > 0 && (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {expiring.length} sertifikasi akan/sudah kedaluwarsa: {expiring.map((c) => c.name).join(", ")}.
          </p>
        )}
        {adding && (
          <CertForm
            profileId={ctx.talent.id}
            catalog={catalog}
            onCancel={() => setAdding(false)}
            onSaved={() => {
              setAdding(false);
              onChanged();
            }}
          />
        )}
        {certs.length === 0 ? (
          <EmptyState>Belum ada sertifikasi tercatat.</EmptyState>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {certs.map((c) => {
              const s = CERT_STATUS[c.status];
              return (
                <li key={c.id} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.issuer ?? "Penerbit tidak diisi"}</div>
                    </div>
                    <Pill className={s.className}>{s.label}</Pill>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 text-xs">
                    <dt className="text-muted-foreground">Terbit</dt>
                    <dd>{fmt(c.issued_on)}</dd>
                    <dt className="text-muted-foreground">Kedaluwarsa</dt>
                    <dd>{c.expires_on ? fmt(c.expires_on) : "Tidak ada"}</dd>
                    <dt className="text-muted-foreground">Credential ID</dt>
                    <dd className="truncate">{c.credential_id ?? "—"}</dd>
                  </dl>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {c.file_path && (
                      <Button size="xs" variant="outline" onClick={() => openFile(c.file_path!)}>
                        <FileText /> File
                      </Button>
                    )}
                    {c.url && (
                      <a className="text-xs text-telkom-red underline" href={c.url} target="_blank" rel="noopener noreferrer">
                        Verifikasi online
                      </a>
                    )}
                    {perms.canVerifyCertification && c.verification !== "verified" && (
                      <Button size="xs" onClick={() => run(() => setCertificationVerification(c.id, "verified"), "Sertifikasi terverifikasi.")}>
                        Verifikasi
                      </Button>
                    )}
                    {perms.canVerifyCertification && c.verification === "pending" && (
                      <Button size="xs" variant="ghost" onClick={() => run(() => setCertificationVerification(c.id, "rejected"), "Sertifikasi ditolak.")}>
                        Tolak
                      </Button>
                    )}
                    {perms.canManageRecords && (
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-label={`Hapus ${c.name}`}
                        onClick={() => window.confirm(`Hapus sertifikasi ${c.name}?`) && run(() => deleteCertification(c.id), "Sertifikasi dihapus.")}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Section>
  );
}
