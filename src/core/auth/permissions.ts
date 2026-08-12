export type AppRole =
  | "admin"
  | "project_manager"
  | "site_engineer"
  | "finance"
  | "viewer"
  | "outfield_worker";

export function isAdmin(role: string | null | undefined): boolean {
  return role === "admin";
}

export function canMutateProjects(role: string | null | undefined): boolean {
  return role === "admin" || role === "project_manager";
}

export function canBroadcast(role: string | null | undefined): boolean {
  return role === "admin" || role === "project_manager";
}
