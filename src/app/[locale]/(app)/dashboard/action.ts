"use server";

import { createClient } from "@/core/supabase/server";
import type { ProjectPhase } from "@/features/projects/types";

export type ActionState = { error?: string; success?: string } | null;

export type DashboardProject = {
  id: number;
  name: string;
  mw_solar: number | null;
  mw_bess: number | null;
  county: string;
  site_location: string;
  current_phase: ProjectPhase;
  value_eur: number | null;
  contract_date: string | null;
  deadline: string | null;
  created_at: string;
};

export type DashboardStats = {
  totalPortfolioValue: number;
  totalCapacity: number;
  totalProjects: number;
  totalFinishedProjects: number;
};

export async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function getProjects(): Promise<DashboardProject[]> {
  const { supabase } = await requireAuth();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, county, site_location, mw_solar, mw_bess, current_phase, deadline, value_eur, contract_date, created_at")
    .order("created_at", { ascending: true });
  return projects ?? [];
}

export async function getDashboardStats(projects: DashboardProject[]): Promise<DashboardStats> {
  return {
    totalPortfolioValue: projects.reduce((acc, p) => acc + (p.value_eur ?? 0), 0),
    totalCapacity: projects.reduce((acc, p) => acc + (p.mw_solar ?? 0), 0),
    totalProjects: projects.length,
    totalFinishedProjects: 0,
  };
}