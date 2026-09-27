import { describe, expect, it } from "vitest";

import { talentPermissions } from "./permissions";

const base = { viewerId: "me", profileId: "me", directManagerId: "boss", inReportingLine: false };

describe("talent authorization helpers (UX mirror of RLS)", () => {
  it("talent on own profile: personal edits and self-assessment, no targets or verification", () => {
    const p = talentPermissions({ ...base, viewerRole: "talent" });
    expect(p.isSelf).toBe(true);
    expect(p.canEditPersonal && p.canAssess && p.canManageRecords && p.canDevelop).toBe(true);
    expect(p.canSetTargets || p.canVerifyEvidence || p.canVerifyCertification || p.canEditPerformance || p.canEditCareer).toBe(false);
  });

  it("indirect manager: coaching rights but no org fields, HR data or records", () => {
    const p = talentPermissions({ ...base, viewerId: "grandboss", viewerRole: "manager", inReportingLine: true });
    expect(p.canSetTargets && p.canVerifyEvidence && p.canDevelop).toBe(true);
    expect(p.canEditOrg || p.canEditPerformance || p.canManageRecords || p.canEditPersonal).toBe(false);
  });

  it("direct manager can set squad/grade", () => {
    expect(talentPermissions({ ...base, viewerId: "boss", viewerRole: "manager", inReportingLine: true }).canEditOrg).toBe(true);
  });

  it("HR owns career, performance and verification", () => {
    const p = talentPermissions({ ...base, viewerId: "hr1", viewerRole: "hr" });
    expect(p.canEditCareer && p.canEditPerformance && p.canVerifyCertification && p.canEditWork).toBe(true);
    expect(p.canEditPersonal).toBe(false);
  });

  it("executive and unrelated talent are read-only", () => {
    for (const role of ["executive", "talent", "pm"] as const) {
      const p = talentPermissions({ ...base, viewerId: "other", viewerRole: role });
      expect(Object.entries(p).filter(([k, v]) => k !== "isSelf" && k !== "isHR" && v)).toEqual([]);
    }
  });

  it("HR cannot self-verify evidence on their own profile", () => {
    const p = talentPermissions({ ...base, viewerId: "me", viewerRole: "hr" });
    expect(p.canVerifyEvidence).toBe(false);
    expect(p.canSetTargets).toBe(true); // HR/admin may set targets, as the DB allows
  });
});
