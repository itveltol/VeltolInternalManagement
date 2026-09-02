"use server";

import { requireAuth } from "@/core/supabase/session";
import { createAdminClient } from "@/core/supabase/admin";
import type { ProjectPhase, ContractType, ProjectCategory, ProjectStatus } from "@/features/projects/types";
import { buildMaintenanceCycles } from "@/features/projects/maintenance/services/maintenanceService";
import type { MaintenanceCheck } from "@/features/projects/maintenance/types";
import { buildAvizReminders } from "@/features/matrice/services/avizReminderService";
import type { Activity, AvizReminder, MatrixCell, MatrixProject } from "@/features/matrice/types";

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
  project_type: string | null;
  status: ProjectStatus;
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

export async function getProjects(): Promise<DashboardProject[]> {
  await requireAuth();
  // Dashboard is a portfolio-wide overview and should show every project to
  // every authenticated user, regardless of the per-manager "projects: scoped
  // select" RLS policy — so this reads via the service-role client instead of
  // the session-scoped one.
  const supabase = createAdminClient();
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name, county, site_location, mw_solar, mw_bess, current_phase, contract_type, project_category, project_type, status, deadline, value_eur, contract_date, created_at")
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
    totalFinishedProjects: projects.filter((p) => p.status === "completed").length,
    residential: getCategoryStats(projects, "residential"),
    industrial: getCategoryStats(projects, "industrial"),
  };
}

export type MaintenanceReminder = {
  projectId: number;
  projectName: string;
  year: number;
  period: "march" | "october";
};

export async function getMaintenanceReminders(projects: DashboardProject[]): Promise<MaintenanceReminder[]> {
  await requireAuth();

  const maintenanceProjects = projects.filter((p) => p.contract_type.includes("mentenanta"));
  if (maintenanceProjects.length === 0) return [];

  const supabase = createAdminClient();
  const projectIds = maintenanceProjects.map((p) => p.id);
  const { data: checks, error: checksError } = await supabase
    .from("project_maintenance_checks")
    .select("*")
    .in("project_id", projectIds);
  if (checksError) {
    console.error("[dashboard debug] maintenance checks query error:", checksError);
    return [];
  }

  const today = new Date();
  const checksByProject = new Map<number, MaintenanceCheck[]>();
  for (const check of (checks ?? []) as MaintenanceCheck[]) {
    const list = checksByProject.get(check.project_id) ?? [];
    list.push(check);
    checksByProject.set(check.project_id, list);
  }

  const reminders: MaintenanceReminder[] = [];
  for (const project of maintenanceProjects) {
    const cycles = buildMaintenanceCycles(checksByProject.get(project.id) ?? [], today);
    for (const cycle of cycles) {
      if (cycle.state === "needsAttention") {
        reminders.push({ projectId: project.id, projectName: project.name, year: cycle.year, period: cycle.period });
      }
    }
  }
  return reminders;
}

export async function getAvizReminders(projects: DashboardProject[]): Promise<AvizReminder[]> {
  await requireAuth();
  const supabase = createAdminClient();

  const [{ data: activities, error: activitiesError }, { data: cells, error: cellsError }] =
    await Promise.all([
      supabase.from("activities").select("*").eq("is_aviz", true),
      supabase.from("project_activity_status").select("project_id, activity_id, status, note, expires_at").eq("status", "finalizat").not("expires_at", "is", null),
    ]);

  if (activitiesError || cellsError) {
    console.error("[dashboard debug] aviz reminders query error:", activitiesError ?? cellsError);
    return [];
  }

  return buildAvizReminders(
    (activities ?? []) as Activity[],
    (cells ?? []) as MatrixCell[],
    projects as MatrixProject[],
    new Date(),
    { includeStates: ['overdue', 'dueSoon', 'notDue'] },
  );
}