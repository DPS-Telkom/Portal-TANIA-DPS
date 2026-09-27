// Hand-written row shapes used until database.types.ts is generated from the
// live project. Keep in sync with supabase/migrations.

export type UserRole =
  | "executive"
  | "chapter_lead"
  | "manager"
  | "pm"
  | "talent"
  | "admin"
  | "guest";

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  squad: string | null;
  grade: string | null;
  location: string | null;
  manager_id: string | null;
  is_active: boolean;
  created_at: string;
}
