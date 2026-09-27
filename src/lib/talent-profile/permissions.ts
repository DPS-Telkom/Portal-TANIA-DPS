import type { UserRole } from "@/lib/types";

// UX-only mirror of the RLS rules in migration 11 — decides which controls to
// show. The database re-checks every write; never rely on this for security.
export interface ViewerFacts {
  viewerId: string;
  viewerRole: UserRole;
  profileId: string;
  directManagerId: string | null;
  inReportingLine: boolean;
}

export interface TalentPermissions {
  isSelf: boolean;
  isHR: boolean;
  canEditPersonal: boolean;
  canEditWork: boolean;
  canEditOrg: boolean;
  canAssess: boolean;
  canSetTargets: boolean;
  canDevelop: boolean;
  canEditCareer: boolean;
  canEditPerformance: boolean;
  canManageRecords: boolean;
  canVerifyCertification: boolean;
  canVerifyEvidence: boolean;
}

export function talentPermissions(v: ViewerFacts): TalentPermissions {
  const isSelf = v.viewerId === v.profileId;
  const isAdmin = v.viewerRole === "admin";
  const isHR = v.viewerRole === "hr" || isAdmin;
  const isLead = v.viewerRole === "chapter_lead";
  const isDirectManager = !isSelf && v.directManagerId === v.viewerId;
  const line = !isSelf && v.inReportingLine;
  const coach = line || isLead || isHR;

  return {
    isSelf,
    isHR,
    canEditPersonal: isSelf || isAdmin,
    canEditWork: isHR,
    canEditOrg: isHR || isDirectManager,
    canAssess: isSelf || coach,
    canSetTargets: (!isSelf && coach) || isHR,
    canDevelop: isSelf || coach,
    canEditCareer: isHR,
    canEditPerformance: isHR,
    canManageRecords: isSelf || isHR,
    canVerifyCertification: isHR,
    canVerifyEvidence: !isSelf && coach,
  };
}
