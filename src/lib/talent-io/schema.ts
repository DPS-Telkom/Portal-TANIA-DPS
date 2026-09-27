// Talent import/export workbook contract (TM-07, XM-03).
// One workbook, one sheet per entity; the exported file can be edited and
// re-imported. Pure definitions + validation — no I/O here (unit-tested).
import type { UserRole } from "@/lib/types";

export type SheetKey = "profil" | "kompetensi" | "karier" | "sertifikasi" | "performance" | "performanceDimensi";
export type ColType = "text" | "email" | "date" | "int" | "number" | "enum" | "bool";

export interface Column {
  key: string;
  header: string;
  type: ColType;
  required?: boolean;
  /** Exported for reference only; ignored on import. */
  readOnly?: boolean;
  values?: readonly string[];
  min?: number;
  max?: number;
  maxLength?: number;
  note?: string;
}

export interface SheetDef {
  key: SheetKey;
  name: string;
  description: string;
  /** Roles whose import of this sheet the database will accept. */
  writers: UserRole[];
  columns: Column[];
}

const HR: UserRole[] = ["hr", "admin"];

export const KINDS = ["capability", "competency", "expertise"] as const;
export const CONFIDENCE = ["low", "medium", "high"] as const;
export const PERF_SOURCE = ["official", "manual"] as const;

export const SHEETS: SheetDef[] = [
  {
    key: "profil",
    name: "Profil",
    description: "Atribut kerja talent. Dicocokkan dengan email. Sel kosong = tidak diubah.",
    writers: HR,
    columns: [
      { key: "email", header: "Email", type: "email", required: true },
      { key: "full_name", header: "Nama (info)", type: "text", readOnly: true, note: "Diubah oleh pemilik profil" },
      { key: "employee_id", header: "Employee ID", type: "text", maxLength: 50 },
      { key: "position_title", header: "Posisi", type: "text", maxLength: 200 },
      { key: "organization", header: "Organisasi", type: "text", maxLength: 200 },
      { key: "career_level", header: "Career level", type: "text", maxLength: 100 },
      { key: "join_date", header: "Tanggal bergabung", type: "date" },
      { key: "squad", header: "Squad", type: "text", maxLength: 100 },
      { key: "grade", header: "Grade", type: "text", maxLength: 20 },
      { key: "location", header: "Lokasi (info)", type: "text", readOnly: true, note: "Diubah oleh pemilik profil" },
    ],
  },
  {
    key: "kompetensi",
    name: "Kompetensi",
    description: "Capability / competency / expertise per talent. Kunci: Email + Nama skill + Jenis.",
    writers: ["hr", "admin", "chapter_lead"],
    columns: [
      { key: "email", header: "Email", type: "email", required: true },
      { key: "skill", header: "Nama skill", type: "text", required: true },
      { key: "kind", header: "Jenis", type: "enum", values: KINDS, required: true },
      { key: "level", header: "Level (1-5)", type: "int", min: 1, max: 5 },
      { key: "target_level", header: "Target level (1-5)", type: "int", min: 1, max: 5 },
      { key: "score", header: "Skor (0-100)", type: "number", min: 0, max: 100 },
      { key: "target_score", header: "Target skor (0-100)", type: "number", min: 0, max: 100 },
      { key: "confidence", header: "Keyakinan", type: "enum", values: CONFIDENCE },
      { key: "years_experience", header: "Tahun pengalaman", type: "number", min: 0, max: 60 },
      { key: "last_used", header: "Terakhir dipakai", type: "date" },
    ],
  },
  {
    key: "karier",
    name: "Karier",
    description: "Riwayat posisi. Kunci: Email + Posisi + Mulai.",
    writers: HR,
    columns: [
      { key: "email", header: "Email", type: "email", required: true },
      { key: "position_title", header: "Posisi", type: "text", required: true, maxLength: 200 },
      { key: "organization", header: "Organisasi", type: "text", maxLength: 200 },
      { key: "start_date", header: "Mulai", type: "date", required: true },
      { key: "end_date", header: "Selesai", type: "date", note: "Kosong = posisi saat ini" },
      { key: "responsibilities", header: "Tanggung jawab", type: "text", maxLength: 4000 },
      { key: "achievements", header: "Pencapaian", type: "text", maxLength: 4000 },
    ],
  },
  {
    key: "sertifikasi",
    name: "Sertifikasi",
    description: "Kunci: Email + Credential ID (atau Nama + Tanggal terbit). Terverifikasi hanya oleh HR.",
    writers: HR,
    columns: [
      { key: "email", header: "Email", type: "email", required: true },
      { key: "name", header: "Nama sertifikasi", type: "text", required: true, maxLength: 200 },
      { key: "issuer", header: "Penerbit", type: "text", maxLength: 200 },
      { key: "credential_id", header: "Credential ID", type: "text", maxLength: 200 },
      { key: "issued_on", header: "Tanggal terbit", type: "date" },
      { key: "expires_on", header: "Kedaluwarsa", type: "date" },
      { key: "url", header: "URL verifikasi", type: "text", maxLength: 500, note: "https://…" },
      { key: "verified", header: "Terverifikasi (Ya/Tidak)", type: "bool" },
      { key: "status", header: "Status (info)", type: "text", readOnly: true },
    ],
  },
  {
    key: "performance",
    name: "Performance",
    description: "Skor tahunan. Kunci: Email + Tahun. Read-only bagi talent/manager; ditulis HR.",
    writers: HR,
    columns: [
      { key: "email", header: "Email", type: "email", required: true },
      { key: "period_year", header: "Tahun", type: "int", required: true, min: 2000, max: 2100 },
      { key: "overall_score", header: "Skor keseluruhan (0-100)", type: "number", min: 0, max: 100 },
      { key: "rating", header: "Rating", type: "text", maxLength: 100 },
      { key: "source", header: "Sumber (official/manual)", type: "enum", values: PERF_SOURCE },
      { key: "summary", header: "Ringkasan", type: "text", maxLength: 4000 },
    ],
  },
  {
    key: "performanceDimensi",
    name: "Performance_Dimensi",
    description: "Skor per dimensi. Kunci: Email + Tahun + Dimensi. Tahun harus ada di sheet/record Performance.",
    writers: HR,
    columns: [
      { key: "email", header: "Email", type: "email", required: true },
      { key: "period_year", header: "Tahun", type: "int", required: true, min: 2000, max: 2100 },
      { key: "dimension", header: "Dimensi", type: "text", required: true, maxLength: 100 },
      { key: "score", header: "Skor (0-100)", type: "number", required: true, min: 0, max: 100 },
    ],
  },
];

export const SHEET_BY_KEY = Object.fromEntries(SHEETS.map((s) => [s.key, s])) as Record<SheetKey, SheetDef>;

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_ROWS_PER_SHEET = 5000;

// ---------------------------------------------------------------------------
// Cell parsing
// ---------------------------------------------------------------------------
export type Cell =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined
  | { text?: string; result?: unknown; hyperlink?: string; richText?: { text: string }[]; error?: string };

/** Excel cells arrive as strings, numbers, Dates, rich text or formula objects. */
export function cellText(v: Cell): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("richText" in v && Array.isArray(v.richText)) return v.richText.map((r) => r.text ?? "").join("").trim();
    if ("result" in v && v.result !== undefined) return cellText(v.result as Cell);
    if ("text" in v && typeof v.text === "string") return v.text.trim();
    if ("hyperlink" in v && typeof v.hyperlink === "string") return v.hyperlink.trim();
    return "";
  }
  return String(v).trim();
}

/** Accepts ISO dates, dd/mm/yyyy, dd-mm-yyyy and Excel Date cells → YYYY-MM-DD. */
export function parseDate(v: Cell): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, "0")}-${String(v.getUTCDate()).padStart(2, "0")}`;
  }
  const s = cellText(v);
  let y: number, m: number, d: number;
  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else if ((match = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/))) [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function parseNumber(v: Cell): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = cellText(v).replace(/\s/g, "");
  if (!s) return null;
  // Accept Indonesian decimal comma ("84,5") but not thousands separators.
  if (!/^-?\d+([.,]\d+)?$/.test(s)) return null;
  return Number(s.replace(",", "."));
}

export function parseBool(v: Cell): boolean | null {
  if (typeof v === "boolean") return v;
  const s = cellText(v).toLowerCase();
  if (["ya", "y", "yes", "true", "1", "verified"].includes(s)) return true;
  if (["tidak", "t", "no", "n", "false", "0", "pending"].includes(s)) return false;
  return null;
}

// ---------------------------------------------------------------------------
// Row validation
// ---------------------------------------------------------------------------
export interface RowIssue {
  sheet: string;
  row: number;
  level: "error" | "warning";
  message: string;
}

export type ParsedValue = string | number | boolean | null;

export interface ParsedRow {
  row: number;
  values: Record<string, ParsedValue>;
  /** Keys whose cells were non-empty (blank = "leave unchanged"). */
  present: Set<string>;
}

export interface SheetResult {
  def: SheetDef;
  rows: ParsedRow[];
  issues: RowIssue[];
}

export interface Lookups {
  /** lower-case email → profile id */
  profileByEmail: Map<string, string>;
  /** `${name.toLowerCase()}|${kind}` → skill id */
  skillByNameKind: Map<string, string>;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validates raw rows (header → cell) of one sheet. Row numbers are Excel's (header = 1). */
export function validateSheet(def: SheetDef, raw: Record<string, Cell>[], lookups: Lookups, firstDataRow = 2): SheetResult {
  const issues: RowIssue[] = [];
  const rows: ParsedRow[] = [];
  const seen = new Map<string, number>();
  const err = (row: number, message: string) => issues.push({ sheet: def.name, row, level: "error", message });
  const warn = (row: number, message: string) => issues.push({ sheet: def.name, row, level: "warning", message });

  if (raw.length > MAX_ROWS_PER_SHEET) {
    err(0, `Maksimal ${MAX_ROWS_PER_SHEET} baris per sheet (ada ${raw.length}).`);
    return { def, rows, issues };
  }

  raw.forEach((cells, i) => {
    const rowNo = firstDataRow + i;
    const values: Record<string, ParsedValue> = {};
    const present = new Set<string>();
    let bad = false;

    if (def.columns.every((c) => cellText(cells[c.header]) === "")) return; // fully empty row

    for (const col of def.columns) {
      if (col.readOnly) continue;
      const cell = cells[col.header];
      const text = cellText(cell);
      if (text === "" && !(cell instanceof Date)) {
        if (col.required) {
          err(rowNo, `Kolom "${col.header}" wajib diisi.`);
          bad = true;
        }
        continue;
      }
      let value: ParsedValue = null;
      switch (col.type) {
        case "email":
          value = text.toLowerCase();
          if (!EMAIL.test(value)) {
            err(rowNo, `Email "${text}" tidak valid.`);
            bad = true;
          }
          break;
        case "date":
          value = parseDate(cell);
          if (value === null) {
            err(rowNo, `"${col.header}" bukan tanggal valid (pakai YYYY-MM-DD atau DD/MM/YYYY).`);
            bad = true;
          }
          break;
        case "int":
        case "number": {
          const n = parseNumber(cell);
          if (n === null || (col.type === "int" && !Number.isInteger(n))) {
            err(rowNo, `"${col.header}" harus ${col.type === "int" ? "bilangan bulat" : "angka"}.`);
            bad = true;
            break;
          }
          if ((col.min !== undefined && n < col.min) || (col.max !== undefined && n > col.max)) {
            err(rowNo, `"${col.header}" harus di antara ${col.min} dan ${col.max}.`);
            bad = true;
            break;
          }
          value = n;
          break;
        }
        case "enum":
          value = text.toLowerCase();
          if (!col.values?.includes(value)) {
            err(rowNo, `"${col.header}" harus salah satu dari: ${col.values?.join(", ")}.`);
            bad = true;
          }
          break;
        case "bool":
          value = parseBool(cell);
          if (value === null) {
            err(rowNo, `"${col.header}" harus Ya atau Tidak.`);
            bad = true;
          }
          break;
        default:
          if (col.maxLength && text.length > col.maxLength) {
            err(rowNo, `"${col.header}" maksimal ${col.maxLength} karakter.`);
            bad = true;
          }
          value = text;
      }
      values[col.key] = value;
      present.add(col.key);
    }
    if (bad) return;

    // Cross-field and reference checks
    const email = values.email as string;
    if (!lookups.profileByEmail.has(email)) {
      err(rowNo, `Email ${email} belum terdaftar di TANIA (import tidak membuat akun baru).`);
      return;
    }
    if (def.key === "kompetensi") {
      const k = `${String(values.skill).toLowerCase()}|${values.kind}`;
      if (!lookups.skillByNameKind.has(k)) {
        err(rowNo, `Skill "${values.skill}" (${values.kind}) tidak ada di katalog.`);
        return;
      }
    }
    if (def.key === "karier" && values.end_date && values.end_date < (values.start_date as string)) {
      err(rowNo, "Tanggal selesai sebelum tanggal mulai.");
      return;
    }
    if (def.key === "sertifikasi") {
      if (values.issued_on && values.expires_on && values.expires_on < (values.issued_on as string)) {
        err(rowNo, "Tanggal kedaluwarsa sebelum tanggal terbit.");
        return;
      }
      if (values.url && !/^https:\/\//i.test(values.url as string)) {
        err(rowNo, "URL verifikasi harus diawali https://");
        return;
      }
      if (!values.credential_id && !values.issued_on) warn(rowNo, "Tanpa Credential ID/tanggal terbit, baris dicocokkan dengan nama saja.");
    }
    if (def.key === "profil" && present.size <= 1) warn(rowNo, "Tidak ada kolom yang diubah.");

    const key = rowKey(def.key, values);
    if (seen.has(key)) {
      err(rowNo, `Duplikat dengan baris ${seen.get(key)} (kunci yang sama).`);
      return;
    }
    seen.set(key, rowNo);
    rows.push({ row: rowNo, values, present });
  });

  return { def, rows, issues };
}

export function rowKey(sheet: SheetKey, v: Record<string, ParsedValue>): string {
  const lc = (x: ParsedValue) => String(x ?? "").toLowerCase();
  switch (sheet) {
    case "profil":
      return lc(v.email);
    case "kompetensi":
      return [lc(v.email), lc(v.skill), lc(v.kind)].join("|");
    case "karier":
      return [lc(v.email), lc(v.position_title), lc(v.start_date)].join("|");
    case "sertifikasi":
      return v.credential_id ? [lc(v.email), "cred", lc(v.credential_id)].join("|") : [lc(v.email), lc(v.name), lc(v.issued_on)].join("|");
    case "performance":
      return [lc(v.email), lc(v.period_year)].join("|");
    case "performanceDimensi":
      return [lc(v.email), lc(v.period_year), lc(v.dimension)].join("|");
  }
}

/** Sheets this role may write — others are shown as "dilewati" (skipped). */
export function writableSheets(role: UserRole): SheetKey[] {
  return SHEETS.filter((s) => s.writers.includes(role)).map((s) => s.key);
}

export function exportFileName(date = new Date()): string {
  const d = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return `TANIA_Talent_${d}.xlsx`;
}
