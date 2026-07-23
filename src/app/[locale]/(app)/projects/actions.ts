"use server";

import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseProjectsClient } from "@/features/projects/api/supabaseProjectsClient";
import * as projectService from "@/features/projects/services/projectService";
import { createProjectFolder, listOneDriveFolderContents } from "@/core/microsoft/folderProvider";
import type { FolderItem } from "@/core/microsoft/folderProvider";
import type { Project, ProjectManager, ProjectCategory, FinancialType } from "@/features/projects/types";
import { CONTRACT_TYPES } from "@/features/projects/types";
import type { ClientRef } from "@/features/clients/types";
import { createSupabaseClientsClient } from "@/features/clients/api/supabaseClientsClient";
import * as clientService from "@/features/clients/services/clientService";
import { createSupabaseChecklistClient } from "@/features/projects/checklists/api/supabaseChecklistClient";
import { createSupabaseMatriceClient } from "@/features/matrice/api/supabaseMatriceClient";
import * as matriceService from "@/features/matrice/services/matriceService";
import { buildDerivedActivityIds } from "@/features/matrice/services/checklistActivityMapping";
import type { ActivityStatus } from "@/features/matrice/types";

export type ActionState = {
  error?: string;
  errorMessage?: string;
  success?: string;
  folderCreated?: boolean;
  projectId?: number;
} | null;

async function getProjectsPath() {
  const locale = await getLocale();
  return `/${locale}/projects`;
}

async function requireAuth() {
  const { supabase, user } = await getSessionUser();
  if (!user) throw new Error("Unauthenticated");
  return { supabase, user };
}

async function requireMutator() {
  const { supabase, user, role } = await getUserProfileRole();
  if (!user) throw new Error("Unauthenticated");
  if (!["admin", "project_manager"].includes(role ?? "")) {
    throw new Error("Forbidden");
  }
  return { supabase, user };
}

/** Only an admin or the project's own manager may reassign its team. */
async function requireProjectOwner(projectId: number) {
  const { supabase, user, role } = await getUserProfileRole();
  if (!user) throw new Error("Unauthenticated");
  if (role === "admin") return { supabase, user };
  const client = createSupabaseProjectsClient(supabase);
  const project = await projectService.getProjectById(client, projectId);
  if (!project || project.manager_id !== user.id) throw new Error("Forbidden");
  return { supabase, user };
}

function extractProjectPayload(formData: FormData, existing?: Project) {
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
  // Disabled form controls (e.g. status/progress in "auto" mode) are omitted
  // from FormData entirely — fall back to the existing DB value instead of
  // sending null/blank and clobbering it.
  const strOrExisting = (key: string, fallback: string | null) => formData.has(key) ? str(key) : fallback;

  const project_category: ProjectCategory =
    formData.get("project_category") === "residential" ? "residential" : "industrial";

  const financial_type: FinancialType =
    formData.get("financial_type") === "finantare" ? "finantare" : "proprii";

  const contract_type = CONTRACT_TYPES.filter(
    (c) => formData.get(`contract_type_${c}`) === "true",
  );

  return {
    name: (formData.get("name") as string).trim(),
    county: str("county"),
    site_location: str("site_location"),
    mw_solar: num("mw_solar"),
    mw_bess: num("mw_bess"),
    project_category,
    financial_type,
    project_type: project_category === "residential" ? null : str("project_type"),
    contract_type,
    manager_id: str("manager_id"),
    client_id: num("client_id"),
    current_phase: (formData.get("current_phase") as string | null) ?? existing?.current_phase ?? "",
    progress_pct: formData.has("progress_pct") ? Number(formData.get("progress_pct")) : existing?.progress_pct ?? 0,
    contract_number: str("contract_number"),
    contract_date: str("contract_date"),
    deadline: str("deadline"),
    value_eur: num("value_eur"),
    status: (formData.get("status") as string | null) ?? existing?.status ?? "on_schedule",
    status_manual: formData.get("status_manual") === "true",
    priority: (formData.get("priority") as string | null) ?? existing?.priority ?? "medium",
    progress_pct_manual: formData.get("progress_pct_manual") === "true",
    cu_issued: formData.get("cu_issued") === "true",
    atr_issued: formData.get("atr_issued") === "true",
    notes: str("notes"),
    paid_by: strOrExisting("paid_by", existing?.paid_by ?? null),
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
    const payload = extractProjectPayload(formData);
    const { id: newId } = await projectService.createProject(client, payload);
    revalidatePath(await getProjectsPath());

    try {
      const folder = await createProjectFolder(payload.name, payload.contract_number);
      await client.linkOneDriveFolder(newId, folder.id, folder.url);
      return { success: "projectCreated", folderCreated: true, projectId: newId };
    } catch {
      return { success: "projectCreated", folderCreated: false, projectId: newId };
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function linkProjectFolder(
  projectId: number,
  input: string,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const client = createSupabaseProjectsClient(supabase);

    let folderId: string;
    let folderUrl: string;

    if (process.env.AZURE_CLIENT_ID) {
      // OneDrive: resolve share URL to a drive item
      const encoded = Buffer.from(input).toString("base64url");
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/shares/u!${encoded}/driveItem`,
        { headers: { Authorization: `Bearer ` } }, // token would be fetched via getGraphToken in full impl
      );
      if (!res.ok) return { error: "folderLinkError" };
      const item = (await res.json()) as { id: string; webUrl: string };
      folderId = item.id;
      folderUrl = item.webUrl;
    } else {
      // Local stub: treat input as an absolute path
      const { stat } = await import("fs/promises");
      try {
        await stat(input);
      } catch {
        return { error: "folderLinkError" };
      }
      folderId = input.split("/").pop() ?? input;
      folderUrl = input;
    }

    await client.linkOneDriveFolder(projectId, folderId, folderUrl);
    const locale = await getLocale();
    revalidatePath(`/${locale}/projects/${projectId}`);
    return { success: "folderLinked" };
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
    const existing = await projectService.getProjectById(client, projectId);
    await projectService.updateProject(client, projectId, extractProjectPayload(formData, existing ?? undefined));
    const locale = await getLocale();
    revalidatePath(await getProjectsPath());
    revalidatePath(`/${locale}/projects/${projectId}`);
    return { success: "projectSaved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    if (e instanceof Error && e.message) return { error: "errorDetail", errorMessage: e.message };
    return { error: "errorGeneric" };
  }
}

export async function deleteProject(projectId: number): Promise<ActionState> {
  try {
    const { supabase, role } = await getUserProfileRole();
    if (role !== "admin") return { error: "errorNotAllowed" };
    const client = createSupabaseProjectsClient(supabase);
    await projectService.deleteProject(client, projectId);
    revalidatePath(await getProjectsPath());
    return { success: "projectDeleted" };
  } catch {
    return { error: "errorGeneric" };
  }
}

export async function getClientRefs(): Promise<ClientRef[]> {
  const { supabase } = await requireAuth();
  const api = createSupabaseClientsClient(supabase);
  return clientService.getClientRefs(api);
}

export async function assignProjectTeam(projectId: number, teamId: number | null): Promise<ActionState> {
  try {
    const { supabase } = await requireProjectOwner(projectId);
    const client = createSupabaseProjectsClient(supabase);
    await projectService.updateProjectTeam(client, projectId, teamId);
    const locale = await getLocale();
    revalidatePath(await getProjectsPath());
    revalidatePath(`/${locale}/projects/${projectId}`);
    revalidatePath(`/${locale}/gantt`);
    return { success: "teamAssigned" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function scanProjectFolder(
  projectId: number,
): Promise<{ files: FolderItem[]; error?: string }> {
  try {
    const { supabase } = await requireAuth();
    const client = createSupabaseProjectsClient(supabase);
    const project = await projectService.getProjectById(client, projectId);
    if (!project?.onedrive_folder_id) {
      return { files: [], error: "noFolderLinked" };
    }
    const files = await listOneDriveFolderContents(project.onedrive_folder_id);
    return { files };
  } catch {
    return { files: [], error: "errorGeneric" };
  }
}

export async function applyFolderScanSuggestions(
  projectId: number,
  checklistUpdates: Array<{ itemNumber: number; plan_total: number }>,
  matriceUpdates: Array<{ activityId: number; status: ActivityStatus }>,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireMutator();
    const checklistClient = createSupabaseChecklistClient(supabase);
    const matriceClient = createSupabaseMatriceClient(supabase);

    for (const { itemNumber, plan_total } of checklistUpdates) {
      await checklistClient.upsertChecklistItem({
        projectId,
        itemNumber,
        plan_total,
        zile: null,
        notes: null,
      });
    }

    // Mapped activities (phase_no 9/10 items also tracked in the checklist)
    // are driven by checklist progress via a DB trigger — a folder-scan
    // suggestion for one of these would just be silently overwritten on the
    // next checklist edit, so skip them here rather than apply-then-clobber.
    const activities = await matriceClient.getActivities();
    const derivedActivityIds = buildDerivedActivityIds(activities);
    for (const { activityId, status } of matriceUpdates) {
      if (derivedActivityIds.has(activityId)) continue;
      await matriceService.setCellStatus(matriceClient, projectId, activityId, status, user.id);
    }

    const locale = await getLocale();
    revalidatePath(`/${locale}/projects/${projectId}`);
    revalidatePath(`/${locale}/matrice-status`);
    return { success: "scanApplied" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}
