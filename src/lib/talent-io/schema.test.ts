import { describe, expect, it } from "vitest";

import {
  SHEET_BY_KEY,
  exportFileName,
  parseBool,
  parseDate,
  parseNumber,
  validateSheet,
  writableSheets,
  type Lookups,
} from "./schema";

const lookups: Lookups = {
  profileByEmail: new Map([["a@telkom.co.id", "p-a"], ["b@telkom.co.id", "p-b"]]),
  skillByNameKind: new Map([["data analytics|competency", "s-da"], ["cloud|expertise", "s-cloud"]]),
};

describe("cell parsing", () => {
  it("parses ISO, Indonesian and Excel dates, rejecting impossible ones", () => {
    expect(parseDate("2024-03-01")).toBe("2024-03-01");
    expect(parseDate("01/03/2024")).toBe("2024-03-01");
    expect(parseDate("1-3-2024")).toBe("2024-03-01");
    expect(parseDate(new Date(Date.UTC(2024, 2, 1)))).toBe("2024-03-01");
    expect(parseDate("31/02/2024")).toBeNull();
    expect(parseDate("maret 2024")).toBeNull();
  });
  it("parses numbers with decimal comma, not thousands separators", () => {
    expect(parseNumber("84,5")).toBe(84.5);
    expect(parseNumber(90)).toBe(90);
    expect(parseNumber("1.000.000")).toBeNull();
    expect(parseNumber("")).toBeNull();
  });
  it("parses Indonesian yes/no", () => {
    expect(parseBool("Ya")).toBe(true);
    expect(parseBool("tidak")).toBe(false);
    expect(parseBool("mungkin")).toBeNull();
  });
});

describe("sheet validation", () => {
  it("accepts a valid competency row and records which cells were filled", () => {
    const r = validateSheet(SHEET_BY_KEY.kompetensi, [
      { Email: "A@Telkom.co.id", "Nama skill": "Data Analytics", Jenis: "Competency", "Level (1-5)": 4 },
    ], lookups);
    expect(r.issues).toEqual([]);
    expect(r.rows[0].values).toMatchObject({ email: "a@telkom.co.id", skill: "Data Analytics", kind: "competency", level: 4 });
    expect(r.rows[0].present.has("target_level")).toBe(false); // blank = unchanged
  });

  it("never lets an import create accounts: unknown emails are errors", () => {
    const r = validateSheet(SHEET_BY_KEY.profil, [{ Email: "new@telkom.co.id", Posisi: "Analyst" }], lookups);
    expect(r.rows).toHaveLength(0);
    expect(r.issues[0].message).toMatch(/belum terdaftar/);
  });

  it("ignores read-only columns such as name and location", () => {
    const r = validateSheet(SHEET_BY_KEY.profil, [{ Email: "a@telkom.co.id", "Nama (info)": "Hacked", Posisi: "Lead" }], lookups);
    expect(r.rows[0].values).not.toHaveProperty("full_name");
    expect(r.rows[0].values.position_title).toBe("Lead");
  });

  it("reports range, enum, catalog and duplicate errors per row", () => {
    const r = validateSheet(SHEET_BY_KEY.kompetensi, [
      { Email: "a@telkom.co.id", "Nama skill": "Data Analytics", Jenis: "competency", "Level (1-5)": 7 },
      { Email: "a@telkom.co.id", "Nama skill": "Data Analytics", Jenis: "hobby", "Level (1-5)": 3 },
      { Email: "a@telkom.co.id", "Nama skill": "Juggling", Jenis: "competency", "Level (1-5)": 3 },
      { Email: "b@telkom.co.id", "Nama skill": "Cloud", Jenis: "expertise", "Level (1-5)": 3 },
      { Email: "b@telkom.co.id", "Nama skill": "cloud", Jenis: "Expertise", "Level (1-5)": 4 },
    ], lookups);
    const msgs = r.issues.map((i) => `${i.row}:${i.message}`);
    expect(msgs[0]).toMatch(/^2:.*antara 1 dan 5/);
    expect(msgs[1]).toMatch(/^3:.*salah satu/);
    expect(msgs[2]).toMatch(/^4:.*tidak ada di katalog/);
    expect(msgs[3]).toMatch(/^6:.*Duplikat dengan baris 5/);
    expect(r.rows.map((x) => x.row)).toEqual([5]);
  });

  it("checks date order, https URLs and required keys", () => {
    const karier = validateSheet(SHEET_BY_KEY.karier, [{ Email: "a@telkom.co.id", Posisi: "PM", Mulai: "2024-05-01", Selesai: "2023-01-01" }], lookups);
    expect(karier.issues[0].message).toMatch(/sebelum tanggal mulai/);
    const cert = validateSheet(SHEET_BY_KEY.sertifikasi, [{ Email: "a@telkom.co.id", "Nama sertifikasi": "X", "URL verifikasi": "http://x" }], lookups);
    expect(cert.issues.some((i) => /https/.test(i.message))).toBe(true);
    const perf = validateSheet(SHEET_BY_KEY.performance, [{ Email: "a@telkom.co.id" }], lookups);
    expect(perf.issues[0].message).toMatch(/Tahun.*wajib/);
  });

  it("skips fully empty rows and caps sheet size", () => {
    expect(validateSheet(SHEET_BY_KEY.profil, [{}, { Email: "" }], lookups).issues).toEqual([]);
    const big = Array.from({ length: 5001 }, () => ({ Email: "a@telkom.co.id" }));
    expect(validateSheet(SHEET_BY_KEY.profil, big, lookups).issues[0].message).toMatch(/Maksimal 5000/);
  });
});

describe("permissions and naming", () => {
  it("lets chapter_lead write only competencies; HR/admin write every sheet", () => {
    expect(writableSheets("chapter_lead")).toEqual(["kompetensi"]);
    expect(writableSheets("hr")).toHaveLength(6);
    expect(writableSheets("talent")).toEqual([]);
  });
  it("follows TANIA_<modul>_<yyyy-mm-dd>.xlsx", () => {
    expect(exportFileName(new Date(2026, 8, 28))).toBe("TANIA_Talent_2026-09-28.xlsx");
  });
});
