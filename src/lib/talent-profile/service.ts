// Talent Profile service — the only module the UI uses for talent data.
// Every call goes through supabase-js with the user's session, so RLS is the
// authorization boundary (CLAUDE.md §2). No business rules live in components.
import { supabase } from "@/lib/supabase";

import type { ActivityStatus, ActivityType, TalentContext } from "./types";

export async function loadTalentContext(profileId: string): Promise<TalentContext | null> {
  const { data, error } = await supabase.rpc("talent_context", { p_profile_id: profileId });
  if (error) throw error;
  return (data ?? null) as unknown as TalentContext | null;
}

export async function isInReportingLine(profileId: string): Promise<boolean> {
  const { data } = await supabase.rpc("is_in_reporting_line", { target: profileId });
  return Boolean(data);
}

export async function listSkills() {
  const { data, error } = await supabase.from("skills").select("id, name, category, kind").order("kind").order("name");
  if (error) throw error;
  return data ?? [];
}

// --- identity -------------------------------------------------------------
export type IdentityPatch = Partial<{
  full_name: string;
  location: string | null;
  squad: string | null;
  grade: string | null;
  employee_id: string | null;
  position_title: string | null;
  organization: string | null;
  career_level: string | null;
  join_date: string | null;
  photo_path: string | null;
}>;

export async function updateIdentity(profileId: string, patch: IdentityPatch) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", profileId);
  if (error) throw error;
}

// --- files (private bucket, short-lived signed URLs) ---------------------
const TALENT_BUCKET = "talent-files";
const MAX_FILE = 5 * 1024 * 1024;

export async function uploadTalentFile(folder: "photos" | "certificates", profileId: string, file: File) {
  if (file.size > MAX_FILE) throw new Error("Ukuran file maksimal 5 MB.");
  if (!/^(image\/(png|jpeg|webp)|application\/pdf)$/.test(file.type))
    throw new Error("Format yang didukung: PNG, JPG, WEBP, PDF.");
  const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
  const path = `${folder}/${profileId}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from(TALENT_BUCKET).upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}

export async function signedTalentFileUrl(path: string, seconds = 300) {
  const { data, error } = await supabase.storage.from(TALENT_BUCKET).createSignedUrl(path, seconds);
  if (error) return null;
  return data.signedUrl;
}

// --- assessments (profile_skills) -----------------------------------------
export interface AssessmentInput {
  level?: number;
  score?: number | null;
  target_level?: number | null;
  target_score?: number | null;
  confidence?: "low" | "medium" | "high" | null;
  years_experience?: number | null;
  last_used?: string | null;
  is_certified?: boolean;
  certification_name?: string | null;
}

export async function addAssessment(profileId: string, skillId: string, input: AssessmentInput & { level: number }) {
  const { error } = await supabase.from("profile_skills").insert({ profile_id: profileId, skill_id: skillId, ...input });
  if (error) throw error;
}

export async function updateAssessment(profileId: string, skillId: string, input: AssessmentInput) {
  const { error } = await supabase.from("profile_skills").update(input).eq("profile_id", profileId).eq("skill_id", skillId);
  if (error) throw error;
}

export async function removeAssessment(profileId: string, skillId: string) {
  const { error } = await supabase.from("profile_skills").delete().eq("profile_id", profileId).eq("skill_id", skillId);
  if (error) throw error;
}

// --- career (HR) ----------------------------------------------------------
export interface PositionInput {
  position_title: string;
  organization?: string | null;
  start_date: string;
  end_date?: string | null;
  responsibilities?: string | null;
  achievements?: string | null;
}

export async function savePosition(profileId: string, input: PositionInput, id?: string) {
  const q = id
    ? supabase.from("talent_positions").update(input).eq("id", id)
    : supabase.from("talent_positions").insert({ profile_id: profileId, ...input });
  const { error } = await q;
  if (error) throw error;
}

export async function deletePosition(id: string) {
  const { error } = await supabase.from("talent_positions").delete().eq("id", id);
  if (error) throw error;
}

// --- certifications -------------------------------------------------------
export interface CertificationInput {
  name: string;
  issuer?: string | null;
  credential_id?: string | null;
  issued_on?: string | null;
  expires_on?: string | null;
  url?: string | null;
  file_path?: string | null;
  skill_id?: string | null;
}

export async function saveCertification(profileId: string, input: CertificationInput, id?: string) {
  const q = id
    ? supabase.from("talent_certifications").update(input).eq("id", id)
    : supabase.from("talent_certifications").insert({ profile_id: profileId, ...input });
  const { error } = await q;
  if (error) throw error;
}

export async function setCertificationVerification(id: string, verification: "verified" | "rejected" | "pending") {
  const { error } = await supabase.from("talent_certifications").update({ verification }).eq("id", id);
  if (error) throw error;
}

export async function deleteCertification(id: string) {
  const { error } = await supabase.from("talent_certifications").delete().eq("id", id);
  if (error) throw error;
}

// --- projects -------------------------------------------------------------
export interface ProjectInput {
  name: string;
  role?: string | null;
  organization?: string | null;
  domain?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  responsibilities?: string | null;
  outcomes?: string | null;
}

export async function saveProject(profileId: string, input: ProjectInput, id?: string) {
  if (id) {
    const { error } = await supabase.from("talent_projects").update(input).eq("id", id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await supabase
    .from("talent_projects")
    .insert({ profile_id: profileId, ...input })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteProject(id: string) {
  const { error } = await supabase.from("talent_projects").delete().eq("id", id);
  if (error) throw error;
}

// --- evidence -------------------------------------------------------------
export interface EvidenceInput {
  evidence_type: string;
  title: string;
  description?: string | null;
  url?: string | null;
  evidence_date?: string | null;
  skill_id?: string | null;
  talent_project_id?: string | null;
  certification_id?: string | null;
  position_id?: string | null;
}

export async function addEvidence(profileId: string, input: EvidenceInput) {
  const { error } = await supabase.from("talent_evidence").insert({ profile_id: profileId, ...input });
  if (error) throw error;
}

export async function setEvidenceVerified(id: string, verified: boolean) {
  const { error } = await supabase.from("talent_evidence").update({ verified }).eq("id", id);
  if (error) throw error;
}

export async function deleteEvidence(id: string) {
  const { error } = await supabase.from("talent_evidence").delete().eq("id", id);
  if (error) throw error;
}

// --- performance (HR only; read-only for everyone else via RLS) -----------
export async function savePerformance(
  profileId: string,
  input: { period_year: number; period_label?: string | null; overall_score: number | null; rating?: string | null; summary?: string | null; source: "official" | "manual" },
  scores: { dimension: string; score: number }[],
) {
  const { data, error } = await supabase
    .from("performance_reviews")
    .upsert({ profile_id: profileId, ...input }, { onConflict: "profile_id,period_year" })
    .select("id")
    .single();
  if (error) throw error;
  const del = await supabase.from("performance_scores").delete().eq("review_id", data.id);
  if (del.error) throw del.error;
  if (scores.length) {
    const ins = await supabase.from("performance_scores").insert(scores.map((s) => ({ review_id: data.id, ...s })));
    if (ins.error) throw ins.error;
  }
}

// --- development plans ----------------------------------------------------
export interface ActivityInput {
  title: string;
  activity_type: ActivityType;
  month_index?: number | null;
  skill_id?: string | null;
  due_date?: string | null;
  sort_order?: number;
}

export async function createPlan(
  profileId: string,
  plan: { title: string; objective?: string | null; target_role?: string | null; start_date?: string | null; due_date?: string | null; origin: "manual" | "ai_recommendation" },
  activities: ActivityInput[],
) {
  const { data, error } = await supabase
    .from("development_plans")
    .insert({ profile_id: profileId, ...plan })
    .select("id")
    .single();
  if (error) throw error;
  if (activities.length) {
    const ins = await supabase
      .from("development_activities")
      .insert(activities.map((a, i) => ({ plan_id: data.id, sort_order: i, ...a })));
    if (ins.error) throw ins.error;
  }
  return data.id as string;
}

export async function setPlanStatus(id: string, status: "draft" | "active" | "completed" | "cancelled") {
  const { error } = await supabase.from("development_plans").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function setActivityStatus(id: string, status: ActivityStatus, evidenceUrl?: string | null) {
  const patch: { status: ActivityStatus; evidence_url?: string | null } = { status };
  if (evidenceUrl !== undefined) patch.evidence_url = evidenceUrl;
  const { error } = await supabase.from("development_activities").update(patch).eq("id", id);
  if (error) throw error;
}

export async function addActivity(planId: string, input: ActivityInput) {
  const { error } = await supabase.from("development_activities").insert({ plan_id: planId, ...input });
  if (error) throw error;
}
