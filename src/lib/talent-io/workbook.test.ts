import ExcelJS from "exceljs";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

import type { Lookups } from "./schema";
import { buildTalentWorkbook, parseTalentWorkbook } from "./workbook";

const lookups: Lookups = {
  profileByEmail: new Map([["a@telkom.co.id", "p-a"]]),
  skillByNameKind: new Map([["data analytics|competency", "s-da"]]),
};

async function fileFrom(wb: ExcelJS.Workbook, name = "talent.xlsx") {
  const buf = await wb.xlsx.writeBuffer();
  return new File([buf], name, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

describe("xlsx round trip (real ExcelJS files)", () => {
  it("template → filled workbook → parsed and validated rows", async () => {
    const blob = await buildTalentWorkbook({ template: true });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer());
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      "Petunjuk",
      "Profil",
      "Kompetensi",
      "Karier",
      "Sertifikasi",
      "Performance",
      "Performance_Dimensi",
    ]);

    const k = wb.getWorksheet("Kompetensi")!;
    k.addRow(["a@telkom.co.id", "Data Analytics", "competency", 4, 5, null, null, "high", 3, new Date(Date.UTC(2026, 7, 31))]);
    k.addRow(["ghost@telkom.co.id", "Data Analytics", "competency", 4]);
    const p = wb.getWorksheet("Profil")!;
    // formula cell + rich text are read as their text/result
    p.addRow(["a@telkom.co.id", "Tidak dipakai", { formula: '"EMP"&"001"', result: "EMP001" }, { richText: [{ text: "Product " }, { text: "Lead" }] }]);

    const parsed = await parseTalentWorkbook(await fileFrom(wb), lookups);
    const komp = parsed.sheets.find((s) => s.def.key === "kompetensi")!;
    expect(komp.rows).toHaveLength(1);
    expect(komp.rows[0].values).toMatchObject({ level: 4, target_level: 5, confidence: "high", years_experience: 3, last_used: "2026-08-31" });
    expect(komp.issues.map((i) => i.message).join()).toMatch(/ghost@telkom\.co\.id belum terdaftar/);

    const profil = parsed.sheets.find((s) => s.def.key === "profil")!;
    expect(profil.rows[0].values).toMatchObject({ employee_id: "EMP001", position_title: "Product Lead" });
    expect(profil.rows[0].values).not.toHaveProperty("full_name");
  });

  it("rejects non-xlsx, oversized and corrupt files before parsing", async () => {
    await expect(parseTalentWorkbook(new File(["a,b"], "data.csv"), lookups)).rejects.toThrow(/xlsx/);
    await expect(parseTalentWorkbook(new File([new Uint8Array(6 * 1024 * 1024)], "big.xlsx"), lookups)).rejects.toThrow(/5 MB/);
    await expect(parseTalentWorkbook(new File(["not a zip"], "bad.xlsx"), lookups)).rejects.toThrow(/tidak dapat dibaca/);
  });

  it("warns about unknown columns and reports missing sheets", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Profil");
    ws.addRow(["Email", "Posisi", "Gaji"]);
    ws.addRow(["a@telkom.co.id", "Lead", 999]);
    const parsed = await parseTalentWorkbook(await fileFrom(wb), lookups);
    expect(parsed.missing).toContain("Kompetensi");
    const profil = parsed.sheets[0];
    expect(profil.issues[0]).toMatchObject({ level: "warning" });
    expect(profil.issues[0].message).toMatch(/Gaji/);
    expect(profil.rows[0].values).not.toHaveProperty("Gaji");
  });
});
