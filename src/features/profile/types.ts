export type AppRole =
  | "admin"
  | "project_manager"
  | "site_engineer"
  | "finance"
  | "viewer"
  | "outfield_worker";

export interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: AppRole;
  created_at: string;
  updated_at: string;
  medical_exam_expires_at: string | null;
  registered_at: string | null;
}
