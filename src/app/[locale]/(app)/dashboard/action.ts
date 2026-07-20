"use server";

import { getSessionUser } from "@/core/supabase/session";
import { createAdminClient } from "@/core/supabase/admin";
import type { ProjectPhase, ContractType, ProjectCategory } from "@/features/projects/types";

export type ActionState = { error?: string; success?: string } | null;

export type DashboardProject = {
  id: number;
  name: string;
  mw_solar: number | null;
  mw_bess: number | null;
  county: string;
  site_location: string;
  current_phase: ProjectPhase;
  contract_type: ContractType[];
  project_category: ProjectCategory;
  value_eur: number | null;
  contract_date: string | null;
  deadline: string | null;
  created_at: string;
};

export type CategoryStats = {
  totalValue: number;
  totalCapacity: number;
  totalProjects: number;
};

export type DashboardStats = {
  totalPortfolioValue: number;
  totalCapacity: number;
  totalProjects: number;
  totalFinishedProjects: number;
  residential: CategoryStats;
  industrial: CategoryStats;
};

export async function requireAuth() {
  const { supabase, user } = await getSessionUser();
  return { supabase, user };
}

export async function getProjects(): Promise<DashboardProject[]> {
  await requireAuth();
  // Dashboard is a portfolio-wide overview and should show every project to
  // every authenticated user, regardless of the per-manager "projects: scoped
  // select" RLS policy — so this reads via the service-role client instead of
  // the session-scoped one.
  const supabase = createAdminClient();
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name, county, site_location, mw_solar, mw_bess, current_phase, contract_type, project_category, deadline, value_eur, contract_date, created_at")
    .order("created_at", { ascending: true });
  if (error) console.error("[dashboard debug] projects query error:", error);
  return projects ?? [];
}

function getCategoryStats(projects: DashboardProject[], category: ProjectCategory): CategoryStats {
  const categoryProjects = projects.filter((p) => p.project_category === category);
  return {
    totalValue: categoryProjects.reduce((acc, p) => acc + (p.value_eur ?? 0), 0),
    totalCapacity: categoryProjects.reduce((acc, p) => acc + (p.mw_solar ?? 0), 0),
    totalProjects: categoryProjects.length,
  };
}

export async function getDashboardStats(projects: DashboardProject[]): Promise<DashboardStats> {
  return {
    totalPortfolioValue: projects.reduce((acc, p) => acc + (p.value_eur ?? 0), 0),
    totalCapacity: projects.reduce((acc, p) => acc + (p.mw_solar ?? 0), 0),
    totalProjects: projects.length,
    totalFinishedProjects: 0,
    residential: getCategoryStats(projects, "residential"),
    industrial: getCategoryStats(projects, "industrial"),
  };
}