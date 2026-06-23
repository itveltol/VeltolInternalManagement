"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import type { Project, ProjectManager } from "@/lib/types/project";

export type ActionState = { error?: string; success?: string } | null;

async function getProjectsPath() {
  const locale = await getLocale();
  return `/${locale}/projects`;
}

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  const { data, error } = await supabase
    .from("projects")
    .select("*, manager:profiles!manager_id(first_name, last_name)")
    .order("id");

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Project[];
}

export async function getProjectManagers(): Promise<ProjectManager[]> {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .in("role", ["admin", "project_manager"])
    .order("last_name");

  if (error) throw new Error(error.message);
  return (data ?? []) as ProjectManager[];
}

export async function createProject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const payload = extractProjectPayload(formData);

    const { error } = await supabase.from("projects").insert(payload);
    if (error) return { error: error.message };

    revalidatePath(await getProjectsPath());
    return { success: "projectCreated" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden")
      return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function updateProject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const projectId = Number(formData.get("projectId"));
    const payload = extractProjectPayload(formData);

    const { error } = await supabase
      .from("projects")
      .update(payload)
      .eq("id", projectId);

    if (error) return { error: error.message };

    revalidatePath(await getProjectsPath());
    return { success: "projectSaved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden")
      return { error: "errorNotAllowed" };
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

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) return { error: error.message };

    revalidatePath(await getProjectsPath());
    return { success: "projectDeleted" };
  } catch {
    return { error: "errorGeneric" };
  }
}
