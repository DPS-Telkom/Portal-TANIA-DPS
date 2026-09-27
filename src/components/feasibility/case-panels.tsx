"use client";

import { Download, Paperclip, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMonth } from "@/lib/dates";
import { friendlyError } from "@/lib/errors";
import { COLUMN_LABELS, RESOURCE_STATUS, type Decision } from "@/lib/feasibility";
import { supabase } from "@/lib/supabase";
import { LEVEL_LABELS } from "@/lib/talent";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// PF-03 Resource check
// ---------------------------------------------------------------------------
interface CheckRow {
  skill_id: string;
  skill_name: string;
  min_level: number;
  headcount: number;
  months: number;
  period_start: string;
  min_candidates: number;
  min_free_fte: number;
  status: string;
}

export function ResourceCheck({ caseId, refreshKey }: { caseId: string; refreshKey: number }) {
  const [rows, setRows] = useState<CheckRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("feasibility_resource_check", { p_case_id: caseId });
      setLoading(false);
      if (error) return setError(friendlyError(error));
      setRows((data ?? []) as CheckRow[]);
      setCheckedAt(new Date());
    })();
  }, [caseId, refreshKey]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource check</CardTitle>
        <CardDescription>
          Talent dengan kompetensi ≥ level minimum dan sisa kapasitas ≥ 50% di <strong>setiap bulan</strong> periode
          case, dibandingkan headcount.
          {checkedAt && ` Dicek ${checkedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Memeriksa…</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tambahkan kompetensi dibutuhkan untuk menjalankan resource check.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-1 font-medium">Kompetensi</th>
                  <th className="py-1 text-right font-medium">Butuh</th>
                  <th className="py-1 text-right font-medium">Tersedia (≥50%)</th>
                  <th className="py-1 text-right font-medium">Kapasitas bebas</th>
                  <th className="py-1 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const s = RESOURCE_STATUS[r.status] ?? RESOURCE_STATUS.kurang;
                  return (
                    <tr key={r.skill_id} className="border-b last:border-0">
                      <td className="py-1.5">
                        <div className="font-medium">{r.skill_name}</div>
                        <div className="text-xs text-muted-foreground">≥ {LEVEL_LABELS[r.min_level]}</div>
                      </td>
                      <td className="py-1.5 text-right">{r.headcount} orang</td>
                      <td className="py-1.5 text-right">{r.min_candidates} orang</td>
                      <td className="py-1.5 text-right">{Number(r.min_free_fte).toFixed(1).replace(".", ",")} FTE</td>
                      <td className="py-1.5 text-right">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", s.className)}>{s.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted-foreground">
              Periode {formatMonth(rows[0].period_start, true)} · {rows[0].months} bulan (maks. 12). Angka = nilai terendah di
              antara bulan-bulan tersebut.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// PF-04 Decision gate — chapter_lead/admin; DB requires a rationale and
// stamps decided_by / decided_at.
// ---------------------------------------------------------------------------
export function DecisionPanel({
  caseId,
  decision,
  rationale,
  decidedAt,
  deciderName,
  canDecide,
  onDecided,
}: {
  caseId: string;
  decision: Decision | null;
  rationale: string | null;
  decidedAt: string | null;
  deciderName: string | null;
  canDecide: boolean;
  onDecided: () => void;
}) {
  const [choice, setChoice] = useState<Decision>(decision ?? "go");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(decision === null);

  async function decide() {
    if (text.trim().length < 10) return toast.error("Rasional keputusan wajib diisi (minimal 10 karakter).");
    setBusy(true);
    const { error } = await supabase
      .from("feasibility_cases")
      .update({ decision: choice, decision_rationale: text.trim() })
      .eq("id", caseId);
    setBusy(false);
    if (error) return toast.error(friendlyError(error));
    toast.success(`Keputusan ${COLUMN_LABELS[choice]} tercatat.`);
    setEditing(false);
    onDecided();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Keputusan</CardTitle>
        <CardDescription>Go / Hold / No-Go oleh Chapter Leader, dengan rasional wajib dan tercatat di audit log.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {decision && (
          <div className="rounded-md border p-3 text-sm">
            <div className="font-semibold">{COLUMN_LABELS[decision]}</div>
            <p className="mt-1 whitespace-pre-line">{rationale}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              oleh {deciderName ?? "—"}
              {decidedAt && ` · ${new Date(decidedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}`}
            </p>
          </div>
        )}
        {!decision && !canDecide && (
          <p className="text-sm text-muted-foreground">Menunggu keputusan Chapter Leader.</p>
        )}
        {canDecide && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Ubah keputusan
          </Button>
        )}
        {canDecide && editing && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Keputusan">
              {(["go", "hold", "no_go"] as Decision[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={choice === d}
                  onClick={() => setChoice(d)}
                  className={cn(
                    "rounded-md border px-4 py-1.5 text-sm font-medium",
                    choice === d && d === "go" && "border-emerald-600 bg-emerald-50 text-emerald-900",
                    choice === d && d === "hold" && "border-amber-600 bg-amber-50 text-amber-900",
                    choice === d && d === "no_go" && "border-red-600 bg-red-50 text-red-900",
                  )}
                >
                  {COLUMN_LABELS[d]}
                </button>
              ))}
            </div>
            <textarea
              className="min-h-24 w-full rounded-md border border-input bg-background p-2 text-sm"
              placeholder="Rasional keputusan (wajib). Untuk 'conditional go', pilih Hold dan tuliskan syaratnya."
              maxLength={4000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="Rasional keputusan"
            />
            <div className="flex gap-2">
              <Button onClick={decide} disabled={busy}>
                {busy ? "Menyimpan…" : "Simpan keputusan"}
              </Button>
              {decision && (
                <Button variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
                  Batal
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// PF-06 Attachments — private bucket, ≤10 MB, members only (storage RLS)
// ---------------------------------------------------------------------------
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = /\.(pdf|docx?|xlsx?|pptx?|csv|png|jpe?g)$/i;

interface FileItem {
  name: string;
  size: number;
  created_at: string;
}

export function Attachments({ caseId, canUpload, canDeleteAny }: { caseId: string; canUpload: boolean; canDeleteAny: boolean }) {
  const prefix = `feasibility/${caseId}`;
  const [files, setFiles] = useState<FileItem[]>([]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.storage.from("attachments").list(prefix, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });
    if (error) return toast.error(friendlyError(error));
    setFiles(
      (data ?? [])
        .filter((f) => f.id)
        .map((f) => ({ name: f.name, size: Number(f.metadata?.size ?? 0), created_at: f.created_at ?? "" })),
    );
  }, [prefix]);

  useEffect(() => {
    load();
  }, [load]);

  async function upload(file: File) {
    if (file.size > MAX_BYTES) return toast.error("Ukuran file maksimal 10 MB.");
    if (!ALLOWED.test(file.name)) return toast.error("Format yang didukung: PDF, Word, Excel, PowerPoint, CSV, PNG, JPG.");
    const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-120);
    setBusy(true);
    const { error } = await supabase.storage.from("attachments").upload(`${prefix}/${Date.now()}-${safe}`, file, {
      upsert: false,
      contentType: file.type || undefined,
    });
    setBusy(false);
    if (input.current) input.current.value = "";
    if (error) return toast.error(friendlyError(error));
    toast.success("Lampiran diunggah.");
    load();
  }

  async function download(name: string) {
    const { data, error } = await supabase.storage.from("attachments").createSignedUrl(`${prefix}/${name}`, 60, {
      download: name.replace(/^\d+-/, ""),
    });
    if (error || !data) return toast.error(friendlyError(error));
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function remove(name: string) {
    if (!window.confirm(`Hapus lampiran ${name.replace(/^\d+-/, "")}?`)) return;
    const { data, error } = await supabase.storage.from("attachments").remove([`${prefix}/${name}`]);
    if (error) return toast.error(friendlyError(error));
    if (!data?.length) return toast.error("Anda hanya dapat menghapus lampiran yang Anda unggah.");
    load();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lampiran</CardTitle>
        <CardDescription>Proposal, cost model, dan dokumen pendukung (maks. 10 MB per file).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada lampiran.</p>
        ) : (
          <ul className="divide-y text-sm">
            {files.map((f) => (
              <li key={f.name} className="flex items-center justify-between gap-2 py-2">
                <span className="min-w-0 truncate">
                  <Paperclip className="mr-1 inline size-3.5" />
                  {f.name.replace(/^\d+-/, "")}
                  <span className="ml-2 text-xs text-muted-foreground">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                </span>
                <span className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon-sm" aria-label="Unduh" onClick={() => download(f.name)}>
                    <Download />
                  </Button>
                  {(canUpload || canDeleteAny) && (
                    <Button variant="ghost" size="icon-sm" aria-label="Hapus lampiran" onClick={() => remove(f.name)}>
                      <Trash2 />
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        {canUpload && (
          <div>
            <input
              ref={input}
              type="file"
              className="text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1"
              disabled={busy}
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
              aria-label="Unggah lampiran"
            />
            {busy && <span className="ml-2 text-sm text-muted-foreground">Mengunggah…</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
