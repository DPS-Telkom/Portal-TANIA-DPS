import { describe, expect, it } from "vitest";

import { friendlyError } from "./errors";

describe("friendlyError", () => {
  it("prefers specific guard messages over the generic 42501", () => {
    expect(friendlyError({ code: "42501", message: "target level is set by your manager or HR" })).toMatch(/Target level/);
    expect(friendlyError({ code: "42501", message: "admin cannot change own role or active status" })).toMatch(/akunnya sendiri/);
    expect(friendlyError({ code: "42501", message: "not allowed to change profile field position_title" })).toMatch(/position_title/);
    expect(friendlyError({ code: "42501", message: "new row violates row-level security policy" })).toBe(
      "Anda tidak memiliki izin untuk perubahan ini.",
    );
  });
});
