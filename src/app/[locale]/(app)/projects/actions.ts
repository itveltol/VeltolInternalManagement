"use server";

import { createClient } from "@/core/supabase/server";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseProjectsClient } from "@/features/projects/api/supabaseProjectsClient";
import * as projectService from "@/features/projects/services/projectService";
import type { Project, ProjectManager } from "@/features/projects/types";

export type ActionState = { error?: string; success?: string } | null;

async function getProjectsPath() {
  const locale = await getLocale();
  return `/${locale}/projects`;
}

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");
  return { supabase, user };
}

async function requireMutator() {
  const { supabase, user } = await requireAuth();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!["admin", "project_manager"].includes(profile?.role ?? "")) {
    throw new Error("Forbidden");
  }
  return { supabase, user };
}

function extractProjectPayload(formData: FormData) {
  const str = (key: string) => {
    const v = formData.get(key) as string | null;
    return v && v.trim() !== "" ? v.trim() : null;
  };
  const num = (key: string) => {
    const v = formData.get(key) as string | null;
    if (!v || v.trim() === "") return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };

  return {
    name: (formData.get("name") as string).trim(),
    county: str("county"),
    site_location: str("site_location"),
    mw_solar: num("mw_solar"),
    mw_bess: num("mw_bess"),
    project_type: str("project_type"),
    manager_id: str("manager_id"),
    current_phase: formData.get("current_phase") as string,
    progress_pct: Number(formData.get("progress_pct") ?? 0),
    contract_number: str("contract_number"),
    contract_date: str("contract_date"),
    deadline: str("deadline"),
    value_eur: num("value_eur"),
    status: formData.get("status") as string,
    priority: formData.get("priority") as string,
    cu_issued: formData.get("cu_issued") === "true",
    atr_issued: formData.get("atr_issued") === "true",
    notes: str("notes"),
  };
}

export async function getProjects(): Promise<Project[]> {
  const { supabase } = await requireAuth();
  const client = createSupabaseProjectsClient(supabase);
  return projectService.getProjects(client);
}

export async function getProjectManagers(): Promise<ProjectManager[]> {
  const { supabase } = await requireAuth();
  const client = createSupabaseProjectsClient(supabase);
  return projectService.getProjectManagers(client);
}

export async function createProject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const client = createSupabaseProjectsClient(supabase);
    await projectService.createProject(client, extractProjectPayload(formData));
    revalidatePath(await getProjectsPath());
    return { success: "projectCreated" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function updateProject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const client = createSupabaseProjectsClient(supabase);
    const projectId = Number(formData.get("projectId"));
    await projectService.updateProject(client, projectId, extractProjectPayload(formData));
    revalidatePath(await getProjectsPath());
    return { success: "projectSaved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function deleteProject(projectId: number): Promise<ActionState> {
  try {
    const { supabase } = await requireAuth();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", (await supabase.auth.getUser()).data.user!.id)
      .single();
    if (profile?.role !== "admin") return { error: "errorNotAllowed" };
    const client = createSupabaseProjectsClient(supabase);
    await projectService.deleteProject(client, projectId);
    revalidatePath(await getProjectsPath());
    return { success: "projectDeleted" };
  } catch {
    return { error: "errorGeneric" };
  }
}
