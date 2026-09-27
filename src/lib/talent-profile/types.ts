// Shape of public.talent_context(profile_id) — the normalized Talent Context
// shared by the UI and the AI (prd-talent §25). Keep in sync with migration 11.

export type SkillKind = "capability" | "competency" | "expertise";
export type AssessmentSource = "self" | "manager" | "hr" | "assessment" | "system";
export type CertificationStatus = "ACTIVE" | "EXPIRING" | "EXPIRED" | "PENDING_VERIFICATION" | "REJECTED";

export interface TalentIdentity {
  id: string;
  full_name: string;
  employee_id: string | null;
  email: string | null;
  role: string;
  position_title: string | null;
  organization: string | null;
  career_level: string | null;
  squad: string | null;
  grade: string | null;
  location: string | null;
  join_date: string | null;
  is_active: boolean;
  is_demo: boolean;
  photo_path: string | null;
  manager: { id: string; full_name: string } | null;
}

export interface LevelScaleItem {
  level: number;
  label: string;
}

export interface CareerPosition {
  id: string;
  profile_id: string;
  position_title: string;
  organization: string | null;
  start_date: string;
  end_date: string | null;
  responsibilities: string | null;
  achievements: string | null;
}

export interface SkillAssessment {
  skill_id: string;
  name: string;
  kind: SkillKind;
  category: string | null;
  level: number;
  target_level: number | null;
  score: number | null;
  target_score: number | null;
  is_certified: boolean;
  certification_name: string | null;
  source: AssessmentSource;
  assessed_at: string | null;
  confidence: "low" | "medium" | "high" | null;
  years_experience: number | null;
  last_used: string | null;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string | null;
  credential_id: string | null;
  issued_on: string | null;
  expires_on: string | null;
  status: CertificationStatus;
  verification: "pending" | "verified" | "rejected";
  skill_id: string | null;
  url: string | null;
  file_path: string | null;
}

export interface TalentProject {
  id: string;
  profile_id: string;
  project_id: string | null;
  name: string;
  role: string | null;
  organization: string | null;
  domain: string | null;
  start_date: string | null;
  end_date: string | null;
  responsibilities: string | null;
  outcomes: string | null;
}

export interface TaniaAssignment {
  project: string;
  first_month: string;
  last_month: string;
  avg_percent: number;
}

export interface PerformanceReview {
  period_year: number;
  period_label: string | null;
  overall_score: number | null;
  rating: string | null;
  summary: string | null;
  source: "official" | "manual";
  scores: { dimension: string; score: number }[];
}

export interface CompetencyGap {
  skill_id: string;
  name: string;
  kind: SkillKind;
  current: number;
  target: number;
  gap: number;
  evidence_count: number;
  source: AssessmentSource;
}

export interface Evidence {
  id: string;
  type: string;
  title: string;
  description: string | null;
  skill: string | null;
  skill_id: string | null;
  date: string | null;
  verified: boolean;
  url: string | null;
  talent_project_id: string | null;
  certification_id: string | null;
  position_id: string | null;
}

export type ActivityType = "learning" | "certification" | "project" | "mentoring" | "assessment" | "milestone" | "other";
export type ActivityStatus = "planned" | "in_progress" | "completed" | "skipped";

export interface DevelopmentActivity {
  id: string;
  title: string;
  type: ActivityType;
  month_index: number | null;
  status: ActivityStatus;
  due_date: string | null;
  completed_at: string | null;
  skill_id: string | null;
  evidence_url: string | null;
}

export interface DevelopmentPlan {
  id: string;
  title: string;
  objective: string | null;
  target_role: string | null;
  status: "draft" | "active" | "completed" | "cancelled";
  origin: "manual" | "ai_recommendation";
  start_date: string | null;
  due_date: string | null;
  activities: DevelopmentActivity[];
}

export interface TalentContext {
  generated_at: string;
  talent: TalentIdentity;
  level_scale: LevelScaleItem[];
  career_history: CareerPosition[];
  skills: SkillAssessment[];
  certifications: Certification[];
  projects: TalentProject[];
  tania_assignments: TaniaAssignment[];
  performance_history: PerformanceReview[];
  gaps: CompetencyGap[];
  evidence: Evidence[];
  development_plans: DevelopmentPlan[];
}
