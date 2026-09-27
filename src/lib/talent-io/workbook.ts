// Talent workbook I/O (TM-07, XM-03). ExcelJS is loaded on demand only
// (CLAUDE.md §5: heavy libraries are dynamic imports). Every read and write
// goes through supabase-js with the user's session, so RLS decides scope.
import type { Workbook, Worksheet } from "exceljs";

import { friendlyError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

import {
  MAX_FILE_BYTES,
  SHEETS,
  SHEET_BY_KEY,
  cellText,
  validateSheet,
  type Cell,
  type Lookups,
  type ParsedRow,
  type SheetKey,
  type SheetResult,
} from "./schema";

async function excel() {
  const mod = await import("exceljs");
  return (mod as unknown as { default?: typeof import("exceljs") }).default ?? mod;
}

/** Pages through a PostgREST query (default 1000-row limit). */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const out: T[] = [];
  for (let from = 0; from < 50_000; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw error;
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

// Row patches are built from validated sheet columns (schema.ts), so they are
// cast once here instead of re-describing every table's Update type.
type Patch = never;

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string;
  employee_id: string | null;
  position_title: string | null;
  organization: string | null;
  career_level: string | null;
  join_date: string | null;
  squad: string | null;
  grade: string | null;
  location: string | null;
}

function styleSheet(ws: Worksheet) {
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B1F4D" } };
  header.alignment = { vertical: "middle" };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.columns.forEach((c) => (c.width = Math.min(Math.max(String(c.header ?? "").length + 4, 14), 40)));
}

function addSheet(wb: Workbook, key: SheetKey, rows: Record<string, unknown>[]) {
  const def = SHEET_BY_KEY[key];
  const ws = wb.addWorksheet(def.name);
  ws.columns = def.columns.map((c) => ({ header: c.header, key: c.key }));
  for (const r of rows) ws.addRow(r);
  styleSheet(ws);
  def.columns.forEach((c, i) => {
    if (c.readOnly) ws.getColumn(i + 1).font = { italic: true, color: { argb: "FF6B7280" } };
  });
}

/**
 * Builds the talent workbook. `profileIds` limits it to given people (e.g. one
 * profile); otherwise everyone the caller may see. Returns the file as a Blob.
 */
export async function buildTalentWorkbook(opts: { profileIds?: string[]; template?: boolean } = {}): Promise<Blob> {
  const ExcelJS = await excel();
  const wb = new ExcelJS.Workbook();
  wb.creator = "TANIA";
  wb.created = new Date();

  const guide = wb.addWorksheet("Petunjuk");
  guide.columns = [{ header: "Sheet", key: "s", width: 22 }, { header: "Keterangan", key: "d", width: 110 }];
  guide.addRow({ s: "Umum", d: "Satu baris = satu record. Sel kosong = tidak diubah. Kolom bertanda (info) hanya referensi dan diabaikan saat import." });
  guide.addRow({ s: "Akun", d: "Import tidak membuat akun baru; email harus sudah terdaftar di TANIA." });
  guide.addRow({ s: "Level", d: "1 Foundation · 2 Beginner · 3 Intermediate · 4 Advanced · 5 Expert. Jenis: capability / competency / expertise." });
  guide.addRow({ s: "Tanggal", d: "Format YYYY-MM-DD atau DD/MM/YYYY." });
  for (const s of SHEETS) guide.addRow({ s: s.name, d: `${s.description} Dapat di-import oleh: ${s.writers.join(", ")}.` });
  styleSheet(guide);

  if (opts.template) {
    for (const s of SHEETS) addSheet(wb, s.key, []);
  } else {
    const scope = opts.profileIds;
    const profiles = await fetchAll<ProfileRow>((a, b) => {
      let q = supabase
        .from("profiles")
        .select("id, email, full_name, employee_id, position_title, organization, career_level, join_date, squad, grade, location")
        .neq("role", "guest")
        .order("full_name")
        .range(a, b);
      if (scope) q = q.in("id", scope);
      return q;
    });
    const emailOf = new Map(profiles.map((p) => [p.id, p.email ?? ""]));
    const ids = profiles.map((p) => p.id);
    const inScope = <Q extends { in: (c: string, v: string[]) => Q }>(q: Q) => (scope ? q.in("profile_id", scope) : q);

    const [skills, positions, certs, reviews] = await Promise.all([
      fetchAll<{ profile_id: string; level: number; target_level: number | null; score: number | null; target_score: number | null; confidence: string | null; years_experience: number | null; last_used: string | null; skill: { name: string; kind: string } | null }>((a, b) =>
        inScope(supabase.from("profile_skills").select("profile_id, level, target_level, score, target_score, confidence, years_experience, last_used, skill:skills(name, kind)")).range(a, b),
      ),
      fetchAll<{ profile_id: string; position_title: string; organization: string | null; start_date: string; end_date: string | null; responsibilities: string | null; achievements: string | null }>((a, b) =>
        inScope(supabase.from("talent_positions").select("profile_id, position_title, organization, start_date, end_date, responsibilities, achievements").order("start_date")).range(a, b),
      ),
      fetchAll<{ profile_id: string; name: string; issuer: string | null; credential_id: string | null; issued_on: string | null; expires_on: string | null; url: string | null; verification: string; status: string }>((a, b) =>
        inScope(supabase.from("talent_certification_status").select("profile_id, name, issuer, credential_id, issued_on, expires_on, url, verification, status")).range(a, b),
      ),
      fetchAll<{ id: string; profile_id: string; period_year: number; overall_score: number | null; rating: string | null; source: string; summary: string | null; scores: { dimension: string; score: number }[] }>((a, b) =>
        inScope(supabase.from("performance_reviews").select("id, profile_id, period_year, overall_score, rating, source, summary, scores:performance_scores(dimension, score)").order("period_year")).range(a, b),
      ),
    ]);
    const known = (pid: string) => emailOf.has(pid) && ids.includes(pid);

    addSheet(wb, "profil", profiles.map((p) => ({ ...p })));
    addSheet(wb, "kompetensi", skills.filter((s) => known(s.profile_id) && s.skill).map((s) => ({ ...s, email: emailOf.get(s.profile_id), skill: s.skill!.name, kind: s.skill!.kind })));
    addSheet(wb, "karier", positions.filter((p) => known(p.profile_id)).map((p) => ({ ...p, email: emailOf.get(p.profile_id) })));
    addSheet(wb, "sertifikasi", certs.filter((c) => known(c.profile_id)).map((c) => ({ ...c, email: emailOf.get(c.profile_id), verified: c.verification === "verified" ? "Ya" : "Tidak" })));
    addSheet(wb, "performance", reviews.filter((r) => known(r.profile_id)).map((r) => ({ ...r, email: emailOf.get(r.profile_id) })));
    addSheet(
      wb,
      "performanceDimensi",
      reviews.filter((r) => known(r.profile_id)).flatMap((r) => r.scores.map((s) => ({ email: emailOf.get(r.profile_id), period_year: r.period_year, ...s }))),
    );
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------------------
// Import: parse + validate (no writes)
// ---------------------------------------------------------------------------
export interface ParsedWorkbook {
  sheets: SheetResult[];
  missing: string[];
}

export async function loadLookups(): Promise<Lookups> {
  const [profiles, skills] = await Promise.all([
    fetchAll<{ id: string; email: string | null }>((a, b) => supabase.from("profiles").select("id, email").neq("role", "guest").range(a, b)),
    fetchAll<{ id: string; name: string; kind: string }>((a, b) => supabase.from("skills").select("id, name, kind").range(a, b)),
  ]);
  return {
    profileByEmail: new Map(profiles.filter((p) => p.email).map((p) => [p.email!.toLowerCase(), p.id])),
    skillByNameKind: new Map(skills.map((s) => [`${s.name.toLowerCase()}|${s.kind}`, s.id])),
  };
}

export async function parseTalentWorkbook(file: File, lookups: Lookups): Promise<ParsedWorkbook> {
  if (file.size > MAX_FILE_BYTES) throw new Error("Ukuran file maksimal 5 MB.");
  if (!/\.xlsx$/i.test(file.name)) throw new Error("Gunakan file Excel .xlsx (unduh template dari TANIA).");
  const ExcelJS = await excel();
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(await file.arrayBuffer());
  } catch {
    throw new Error("File tidak dapat dibaca sebagai Excel .xlsx.");
  }

  const sheets: SheetResult[] = [];
  const missing: string[] = [];
  for (const def of SHEETS) {
    const ws = wb.getWorksheet(def.name);
    if (!ws) {
      missing.push(def.name);
      continue;
    }
    const headers: string[] = [];
    ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => (headers[col] = cellText(cell.value as Cell)));
    const raw: Record<string, Cell>[] = [];
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const rec: Record<string, Cell> = {};
      headers.forEach((h, col) => {
        if (h) rec[h] = row.getCell(col).value as Cell;
      });
      raw.push(rec);
    }
    const unknownHeaders = headers.filter((h) => h && !def.columns.some((c) => c.header === h));
    const result = validateSheet(def, raw, lookups);
    if (unknownHeaders.length) {
      result.issues.unshift({ sheet: def.name, row: 1, level: "warning", message: `Kolom tidak dikenal diabaikan: ${unknownHeaders.join(", ")}` });
    }
    sheets.push(result);
  }
  return { sheets, missing };
}

// ---------------------------------------------------------------------------
// Import: execute (writes, RLS-enforced)
// ---------------------------------------------------------------------------
export interface ImportOutcome {
  sheet: string;
  row: number;
  status: "ditambah" | "diperbarui" | "gagal";
  message?: string;
}

const pick = (r: ParsedRow, keys: string[]) =>
  Object.fromEntries(keys.filter((k) => r.present.has(k)).map((k) => [k, r.values[k]]));

export async function executeImport(
  parsed: ParsedWorkbook,
  allowed: SheetKey[],
  lookups: Lookups,
  onProgress?: (done: number, total: number) => void,
): Promise<ImportOutcome[]> {
  const out: ImportOutcome[] = [];
  const sheets = parsed.sheets.filter((s) => allowed.includes(s.def.key) && s.rows.length);
  const total = sheets.reduce((n, s) => n + s.rows.length, 0);
  let done = 0;
  const tick = () => onProgress?.(++done, total);
  const pid = (r: ParsedRow) => lookups.profileByEmail.get(r.values.email as string)!;
  const fail = (sheet: string, row: number, e: unknown) =>
    out.push({ sheet, row, status: "gagal", message: e instanceof Error && !("code" in e) ? e.message : friendlyError(e as { message?: string; code?: string }) });

  // Order matters: performance reviews must exist before their dimensions.
  const order: SheetKey[] = ["profil", "kompetensi", "karier", "sertifikasi", "performance", "performanceDimensi"];
  for (const key of order) {
    const sheet = sheets.find((s) => s.def.key === key);
    if (!sheet) continue;
    const name = sheet.def.name;
    const ids = [...new Set(sheet.rows.map(pid))];

    if (key === "profil") {
      for (const r of sheet.rows) {
        const patch = pick(r, ["employee_id", "position_title", "organization", "career_level", "join_date", "squad", "grade"]);
        if (!Object.keys(patch).length) {
          tick();
          continue;
        }
        const { data, error } = await supabase.from("profiles").update(patch as Patch).eq("id", pid(r)).select("id");
        if (error) fail(name, r.row, error);
        else if (!data?.length) out.push({ sheet: name, row: r.row, status: "gagal", message: "Tidak diizinkan mengubah profil ini." });
        else out.push({ sheet: name, row: r.row, status: "diperbarui" });
        tick();
      }
    }

    if (key === "kompetensi") {
      const existing = await fetchAll<{ profile_id: string; skill_id: string }>((a, b) =>
        supabase.from("profile_skills").select("profile_id, skill_id").in("profile_id", ids).range(a, b),
      );
      const has = new Set(existing.map((e) => `${e.profile_id}|${e.skill_id}`));
      for (const r of sheet.rows) {
        const skillId = lookups.skillByNameKind.get(`${String(r.values.skill).toLowerCase()}|${r.values.kind}`)!;
        const fields = pick(r, ["level", "target_level", "score", "target_score", "confidence", "years_experience", "last_used"]);
        const exists = has.has(`${pid(r)}|${skillId}`);
        if (!exists && !r.present.has("level")) {
          out.push({ sheet: name, row: r.row, status: "gagal", message: "Level wajib diisi untuk kompetensi baru." });
          tick();
          continue;
        }
        const { error } = exists
          ? await supabase.from("profile_skills").update(fields as Patch).eq("profile_id", pid(r)).eq("skill_id", skillId)
          : await supabase.from("profile_skills").insert({ profile_id: pid(r), skill_id: skillId, level: r.values.level as number, ...fields } as Patch);
        if (error) fail(name, r.row, error);
        else out.push({ sheet: name, row: r.row, status: exists ? "diperbarui" : "ditambah" });
        tick();
      }
    }

    if (key === "karier") {
      const existing = await fetchAll<{ id: string; profile_id: string; position_title: string; start_date: string }>((a, b) =>
        supabase.from("talent_positions").select("id, profile_id, position_title, start_date").in("profile_id", ids).range(a, b),
      );
      const byKey = new Map(existing.map((e) => [`${e.profile_id}|${e.position_title.toLowerCase()}|${e.start_date}`, e.id]));
      for (const r of sheet.rows) {
        const fields = pick(r, ["position_title", "organization", "start_date", "end_date", "responsibilities", "achievements"]);
        const id = byKey.get(`${pid(r)}|${String(r.values.position_title).toLowerCase()}|${r.values.start_date}`);
        const { error } = id
          ? await supabase.from("talent_positions").update(fields as Patch).eq("id", id)
          : await supabase.from("talent_positions").insert({ profile_id: pid(r), ...fields } as Patch);
        if (error) fail(name, r.row, error);
        else out.push({ sheet: name, row: r.row, status: id ? "diperbarui" : "ditambah" });
        tick();
      }
    }

    if (key === "sertifikasi") {
      const existing = await fetchAll<{ id: string; profile_id: string; name: string; credential_id: string | null; issued_on: string | null }>((a, b) =>
        supabase.from("talent_certifications").select("id, profile_id, name, credential_id, issued_on").in("profile_id", ids).range(a, b),
      );
      for (const r of sheet.rows) {
        const p = pid(r);
        const match = existing.find((e) =>
          e.profile_id === p &&
          (r.values.credential_id
            ? (e.credential_id ?? "").toLowerCase() === String(r.values.credential_id).toLowerCase()
            : e.name.toLowerCase() === String(r.values.name).toLowerCase() && (e.issued_on ?? "") === (r.values.issued_on ?? "")),
        );
        const fields: Record<string, unknown> = pick(r, ["name", "issuer", "credential_id", "issued_on", "expires_on", "url"]);
        if (r.present.has("verified")) fields.verification = r.values.verified ? "verified" : "pending";
        const { error } = match
          ? await supabase.from("talent_certifications").update(fields as Patch).eq("id", match.id)
          : await supabase.from("talent_certifications").insert({ profile_id: p, ...fields } as Patch);
        if (error) fail(name, r.row, error);
        else out.push({ sheet: name, row: r.row, status: match ? "diperbarui" : "ditambah" });
        tick();
      }
    }

    if (key === "performance") {
      const existing = await fetchAll<{ profile_id: string; period_year: number }>((a, b) =>
        supabase.from("performance_reviews").select("profile_id, period_year").in("profile_id", ids).range(a, b),
      );
      const has = new Set(existing.map((e) => `${e.profile_id}|${e.period_year}`));
      for (const r of sheet.rows) {
        const fields = pick(r, ["overall_score", "rating", "source", "summary"]);
        const { error } = await supabase
          .from("performance_reviews")
          .upsert({ profile_id: pid(r), period_year: r.values.period_year as number, ...fields } as Patch, { onConflict: "profile_id,period_year" });
        if (error) fail(name, r.row, error);
        else out.push({ sheet: name, row: r.row, status: has.has(`${pid(r)}|${r.values.period_year}`) ? "diperbarui" : "ditambah" });
        tick();
      }
    }

    if (key === "performanceDimensi") {
      const reviews = await fetchAll<{ id: string; profile_id: string; period_year: number }>((a, b) =>
        supabase.from("performance_reviews").select("id, profile_id, period_year").in("profile_id", ids).range(a, b),
      );
      const reviewId = new Map(reviews.map((rv) => [`${rv.profile_id}|${rv.period_year}`, rv.id]));
      for (const r of sheet.rows) {
        const id = reviewId.get(`${pid(r)}|${r.values.period_year}`);
        if (!id) {
          out.push({ sheet: name, row: r.row, status: "gagal", message: `Performance tahun ${r.values.period_year} belum ada untuk ${r.values.email}.` });
          tick();
          continue;
        }
        const { error } = await supabase
          .from("performance_scores")
          .upsert({ review_id: id, dimension: String(r.values.dimension), score: r.values.score as number }, { onConflict: "review_id,dimension" });
        if (error) fail(name, r.row, error);
        else out.push({ sheet: name, row: r.row, status: "diperbarui" });
        tick();
      }
    }
  }
  return out;
}

/** Downloadable import report (validation issues + write outcomes). */
export async function buildReport(parsed: ParsedWorkbook, outcomes: ImportOutcome[]): Promise<Blob> {
  const ExcelJS = await excel();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Laporan import");
  ws.columns = [
    { header: "Sheet", key: "sheet", width: 22 },
    { header: "Baris", key: "row", width: 8 },
    { header: "Hasil", key: "status", width: 14 },
    { header: "Keterangan", key: "message", width: 90 },
  ];
  for (const s of parsed.sheets) for (const i of s.issues) ws.addRow({ sheet: i.sheet, row: i.row, status: i.level === "error" ? "ditolak" : "peringatan", message: i.message });
  for (const o of outcomes) ws.addRow(o);
  styleSheet(ws);
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
