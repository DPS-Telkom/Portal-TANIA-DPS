"use client";

import { ArrowLeft, Download, FileSpreadsheet, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { SHEETS, exportFileName, writableSheets, type SheetKey } from "@/lib/talent-io/schema";
import {
  buildReport,
  buildTalentWorkbook,
  downloadBlob,
  executeImport,
  loadLookups,
  parseTalentWorkbook,
  type ImportOutcome,
  type ParsedWorkbook,
} from "@/lib/talent-io/workbook";
import type { Lookups } from "@/lib/talent-io/schema";
import type { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const IMPORTERS: UserRole[] = ["hr", "admin", "chapter_lead"];

type Step = "pilih" | "pratinjau" | "proses" | "selesai";

export default function TalentImportPage() {
  const { profile } = useAuth();
  const [step, setStep] = useState<Step>("pilih");
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedWorkbook | null>(null);
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [outcomes, setOutcomes] = useState<ImportOutcome[]>([]);
  const [issueFilter, setIssueFilter] = useState<"error" | "warning" | "all">("error");
  const input = useRef<HTMLInputElement>(null);

  if (!profile) return null;
  if (!IMPORTERS.includes(profile.role)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import data talent</CardTitle>
          <CardDescription>Import hanya untuk HR, Admin, dan Chapter Leader. Anda tetap bisa mengekspor data dari halaman Talent.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const allowed = writableSheets(profile.role);
  const validRows = (key: SheetKey) => parsed?.sheets.find((s) => s.def.key === key)?.rows.length ?? 0;
  const importable = parsed?.sheets.filter((s) => allowed.includes(s.def.key)).reduce((n, s) => n + s.rows.length, 0) ?? 0;

  async function download(template: boolean) {
    setBusy(true);
    try {
      const blob = await buildTalentWorkbook({ template });
      downloadBlob(blob, template ? "TANIA_Talent_template.xlsx" : exportFileName());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat file.");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File) {
    setBusy(true);
    setFileName(file.name);
    try {
      const lk = lookups ?? (await loadLookups());
      setLookups(lk);
      const result = await parseTalentWorkbook(file, lk);
      if (!result.sheets.length) throw new Error("Tidak ada sheet TANIA yang dikenali. Gunakan template dari halaman ini.");
      setParsed(result);
      setStep("pratinjau");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "File tidak dapat diproses.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function run() {
    if (!parsed || !lookups) return;
    if (!window.confirm(`Import ${importable} baris ke database TANIA? Setiap perubahan tercatat di audit log.`)) return;
    setStep("proses");
    const res = await executeImport(parsed, allowed, lookups, (done, total) => setProgress({ done, total }));
    setOutcomes(res);
    setStep("selesai");
  }

  function reset() {
    setParsed(null);
    setOutcomes([]);
    setProgress({ done: 0, total: 0 });
    setStep("pilih");
  }

  const issues = parsed?.sheets.flatMap((s) => s.issues).filter((i) => issueFilter === "all" || i.level === issueFilter) ?? [];
  const count = (st: ImportOutcome["status"]) => outcomes.filter((o) => o.status === st).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/talent" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Kembali ke Talent
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-tania-navy">Import data talent</h1>
        <p className="text-muted-foreground">
          Unggah workbook Excel TANIA. Data dicocokkan ke user yang sudah terdaftar (email); sel kosong tidak mengubah data.
        </p>
      </div>

      <ol className="flex flex-wrap gap-2 text-xs" aria-label="Langkah">
        {(["pilih", "pratinjau", "proses", "selesai"] as Step[]).map((s, i) => (
          <li key={s} className={cn("rounded-full border px-3 py-1", step === s ? "border-telkom-red bg-telkom-red/10 font-semibold text-telkom-red" : "text-muted-foreground")}>
            {i + 1}. {{ pilih: "Pilih file", pratinjau: "Pratinjau & validasi", proses: "Import", selesai: "Hasil" }[s]}
          </li>
        ))}
      </ol>

      {step === "pilih" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="size-5 text-emerald-600" /> 1. Siapkan file
              </CardTitle>
              <CardDescription>Mulai dari template kosong, atau ekspor data sekarang lalu edit.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => download(true)} disabled={busy}>
                <Download /> Template kosong
              </Button>
              <Button variant="outline" onClick={() => download(false)} disabled={busy}>
                <Download /> Ekspor data saat ini
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="size-5 text-telkom-red" /> 2. Unggah workbook
              </CardTitle>
              <CardDescription>File .xlsx, maksimal 5 MB dan 5.000 baris per sheet. Belum ada yang ditulis sebelum Anda konfirmasi.</CardDescription>
            </CardHeader>
            <CardContent>
              <input
                ref={input}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                disabled={busy}
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
                className="text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5"
                aria-label="Pilih file Excel"
              />
              {busy && <p className="mt-2 text-sm text-muted-foreground">Memproses…</p>}
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Hak import Anda</CardTitle>
              <CardDescription>Database menolak penulisan di luar hak role Anda; sheet lain akan dilewati.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 text-sm sm:grid-cols-2">
                {SHEETS.map((s) => (
                  <li key={s.key} className="flex items-start justify-between gap-2 rounded-md border px-3 py-2">
                    <span>
                      <span className="font-medium">{s.name}</span>
                      <span className="block text-xs text-muted-foreground">{s.description}</span>
                    </span>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs", allowed.includes(s.key) ? "bg-emerald-100 text-emerald-900" : "bg-neutral-100 text-neutral-600")}>
                      {allowed.includes(s.key) ? "Boleh" : "Dilewati"}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "pratinjau" && parsed && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pratinjau: {fileName}</CardTitle>
              <CardDescription>
                {importable} baris siap di-import. Baris dengan error tidak akan ditulis.
                {parsed.missing.length > 0 && ` Sheet tidak ada di file: ${parsed.missing.join(", ")}.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-1 font-medium">Sheet</th>
                    <th className="py-1 text-right font-medium">Valid</th>
                    <th className="py-1 text-right font-medium">Error</th>
                    <th className="py-1 text-right font-medium">Peringatan</th>
                    <th className="py-1 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.sheets.map((s) => (
                    <tr key={s.def.key} className="border-b last:border-0">
                      <td className="py-1.5 font-medium">{s.def.name}</td>
                      <td className="py-1.5 text-right">{validRows(s.def.key)}</td>
                      <td className="py-1.5 text-right text-red-700">{s.issues.filter((i) => i.level === "error").length}</td>
                      <td className="py-1.5 text-right text-amber-700">{s.issues.filter((i) => i.level === "warning").length}</td>
                      <td className="py-1.5 text-right">
                        {allowed.includes(s.def.key) ? (
                          <span className="text-emerald-700">Akan di-import</span>
                        ) : (
                          <span className="text-muted-foreground">Dilewati (butuh HR/Admin)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Detail validasi</CardTitle>
                <select className="h-8 rounded-md border bg-background px-2 text-sm" value={issueFilter} onChange={(e) => setIssueFilter(e.target.value as typeof issueFilter)} aria-label="Filter detail">
                  <option value="error">Error saja</option>
                  <option value="warning">Peringatan saja</option>
                  <option value="all">Semua</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {issues.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tidak ada {issueFilter === "warning" ? "peringatan" : "error"}.</p>
              ) : (
                <ul className="max-h-80 divide-y overflow-y-auto text-sm">
                  {issues.slice(0, 300).map((i, n) => (
                    <li key={n} className="flex gap-3 py-1.5">
                      <span className={cn("w-16 shrink-0 font-medium", i.level === "error" ? "text-red-700" : "text-amber-700")}>{i.level === "error" ? "Error" : "Warning"}</span>
                      <span className="w-40 shrink-0 text-muted-foreground">
                        {i.sheet} {i.row > 0 && `· baris ${i.row}`}
                      </span>
                      <span>{i.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={reset}>
              Pilih file lain
            </Button>
            <Button onClick={run} disabled={importable === 0}>
              Import {importable} baris
            </Button>
          </div>
        </div>
      )}

      {step === "proses" && (
        <Card>
          <CardHeader>
            <CardTitle>Mengimpor…</CardTitle>
            <CardDescription>Jangan tutup halaman ini.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-2 rounded-full bg-muted" role="progressbar" aria-valuenow={progress.done} aria-valuemax={progress.total} aria-label="Progres import">
              <div className="h-full rounded-full bg-telkom-red transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {progress.done} / {progress.total} baris
            </p>
          </CardContent>
        </Card>
      )}

      {step === "selesai" && parsed && (
        <Card>
          <CardHeader>
            <CardTitle>Import selesai</CardTitle>
            <CardDescription>Semua perubahan tercatat di audit log.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-bold text-emerald-700">{count("ditambah")}</div>
                <div className="text-xs text-muted-foreground">ditambah</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-bold text-sky-700">{count("diperbarui")}</div>
                <div className="text-xs text-muted-foreground">diperbarui</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-bold text-red-700">{count("gagal")}</div>
                <div className="text-xs text-muted-foreground">gagal</div>
              </div>
            </div>
            {count("gagal") > 0 && (
              <ul className="max-h-60 divide-y overflow-y-auto text-sm">
                {outcomes
                  .filter((o) => o.status === "gagal")
                  .map((o, n) => (
                    <li key={n} className="py-1.5">
                      <span className="text-muted-foreground">
                        {o.sheet} · baris {o.row}:
                      </span>{" "}
                      {o.message}
                    </li>
                  ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={async () => downloadBlob(await buildReport(parsed, outcomes), `TANIA_Talent_laporan-import_${exportFileName().slice(13)}`)}>
                <Download /> Unduh laporan
              </Button>
              <Button onClick={reset}>Import file lain</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
