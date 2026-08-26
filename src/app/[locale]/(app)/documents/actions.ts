"use server";

import { z } from "zod";
import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseDocumentsClient } from "@/features/documents/api/supabaseDocumentsClient";
import * as documentService from "@/features/documents/services/documentService";
import type { Document, DocumentCategory, DocumentStatus } from "@/features/documents/types";
import type { GetDocumentsFilter } from "@/features/documents/api/types";
import { resolveActivityIdForLabel } from "@/features/documents/labelActivityMapping";

const linkedTypeSchema = z.enum(["project", "client", "matrice_cell", "checklist_item"]);

export type ActionState = { error?: string; success?: string } | null;

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

function strOrNull(raw: FormDataEntryValue | null): string | null {
  const s = (raw as string | null)?.trim() ?? "";
  return s === "" ? null : s;
}

function intOrDefault(raw: FormDataEntryValue | null, fallback: number): number {
  if (raw === null || raw === "") return fallback;
  const n = parseInt(raw as string, 10);
  return isNaN(n) ? fallback : n;
}

export async function getDocuments(filter?: GetDocumentsFilter): Promise<Document[]> {
  const { supabase } = await requireAuth();
  const api = createSupabaseDocumentsClient(supabase);
  return documentService.getDocuments(api, filter);
}

export async function getResponsibleProfilesAction() {
  const { supabase } = await requireAuth();
  const api = createSupabaseDocumentsClient(supabase);
  return documentService.getResponsibleProfiles(api);
}

export async function createDocumentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireMutator();
    const api = createSupabaseDocumentsClient(supabase);

    const name      = strOrNull(formData.get("name"));
    const url       = strOrNull(formData.get("url"));
    const linkedType = strOrNull(formData.get("linked_type"));
    const linkedId   = strOrNull(formData.get("linked_id"));
    const projectIdRaw = formData.get("project_id");
    const projectId = projectIdRaw && String(projectIdRaw).trim() !== "" ? Number(projectIdRaw) : null;
    const isRenewable = formData.get("is_renewable") === "on";
    const expiresAt = isRenewable ? strOrNull(formData.get("expires_at")) : null;
    const category  = strOrNull(formData.get("category")) as DocumentCategory | null;
    const status    = strOrNull(formData.get("status")) as DocumentStatus | null;
    const submittedAt = strOrNull(formData.get("submitted_at"));
    const obtainedAt  = strOrNull(formData.get("obtained_at"));
    const responsibleId = strOrNull(formData.get("responsible_id"));
    const version   = intOrDefault(formData.get("version"), 1);
    const label     = strOrNull(formData.get("label"));

    if (!name || !url || !linkedType || !linkedId) return { error: "errorGeneric" };
    const linkedTypeResult = linkedTypeSchema.safeParse(linkedType);
    if (!linkedTypeResult.success) return { error: "errorValidation" };

    let resolvedLinkedType = linkedTypeResult.data;
    let resolvedLinkedId = linkedId;
    if (label && projectId && resolvedLinkedType === "project") {
      const { getCachedActivities } = await import("@/features/matrice/services/matriceService");
      const activities = await getCachedActivities();
      const activityId = resolveActivityIdForLabel(label, activities);
      if (activityId) {
        resolvedLinkedType = "matrice_cell";
        resolvedLinkedId = `${projectId}:${activityId}`;
      }
    }

    await documentService.createDocument(api, {
      name,
      url,
      linked_type: resolvedLinkedType,
      linked_id: resolvedLinkedId,
      project_id: projectId,
      is_renewable: isRenewable,
      expires_at: expiresAt,
      category,
      status,
      submitted_at: submittedAt,
      obtained_at: obtainedAt,
      responsible_id: responsibleId,
      version,
      label,
      created_by: user.id,
    });

    const locale = await getLocale();
    revalidatePath(`/${locale}/documents`);
    if (projectId) revalidatePath(`/${locale}/projects/${projectId}`);

    return { success: "documentCreated" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function updateDocumentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const api = createSupabaseDocumentsClient(supabase);

    const id = Number(formData.get("id"));
    if (!id) return { error: "errorGeneric" };

    const projectIdRaw = formData.get("project_id");
    const projectId = projectIdRaw && String(projectIdRaw).trim() !== "" ? Number(projectIdRaw) : null;
    const isRenewable = formData.get("is_renewable") === "on";
    const expiresAt = isRenewable ? strOrNull(formData.get("expires_at")) : null;
    const category  = strOrNull(formData.get("category")) as DocumentCategory | null;
    const status    = strOrNull(formData.get("status")) as DocumentStatus | null;

    await documentService.updateDocument(api, id, {
      name:           strOrNull(formData.get("name")) ?? undefined,
      url:            strOrNull(formData.get("url")) ?? undefined,
      is_renewable:   isRenewable,
      expires_at:     expiresAt,
      category,
      status,
      submitted_at:   strOrNull(formData.get("submitted_at")),
      obtained_at:    strOrNull(formData.get("obtained_at")),
      responsible_id: strOrNull(formData.get("responsible_id")),
      version:        intOrDefault(formData.get("version"), 1),
    });

    const locale = await getLocale();
    revalidatePath(`/${locale}/documents`);
    if (projectId) revalidatePath(`/${locale}/projects/${projectId}`);

    return { success: "documentUpdated" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function uploadDocumentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireMutator();

    const projectId = Number(formData.get("project_id"));
    const label = strOrNull(formData.get("label"));
    const file = formData.get("file");
    if (!projectId || !label || !(file instanceof File) || file.size === 0) {
      return { error: "errorGeneric" };
    }

    const { createSupabaseProjectsClient } = await import("@/features/projects/api/supabaseProjectsClient");
    const projectsApi = createSupabaseProjectsClient(supabase);
    const project = await projectsApi.getProjectById(projectId);
    if (!project?.onedrive_folder_id) return { error: "errorNoProjectFolder" };

    const { ensureSubfolder, uploadFileToFolder, deleteFileById } = await import("@/core/microsoft/folderProvider");
    const subfolder = await ensureSubfolder(project.onedrive_folder_id, label);
    const content = await file.arrayBuffer();
    const uploaded = await uploadFileToFolder(subfolder.id, file.name, content);

    let linkedType: "project" | "matrice_cell" = "project";
    let linkedId = String(projectId);

    const { getCachedActivities } = await import("@/features/matrice/services/matriceService");
    const activities = await getCachedActivities();
    const activityId = resolveActivityIdForLabel(label, activities);
    if (activityId) {
      linkedType = "matrice_cell";
      linkedId = `${projectId}:${activityId}`;
    }

    try {
      const api = createSupabaseDocumentsClient(supabase);
      await documentService.createDocument(api, {
        name: file.name,
        url: uploaded.webUrl,
        linked_type: linkedType,
        linked_id: linkedId,
        project_id: projectId,
        is_renewable: false,
        expires_at: null,
        category: null,
        status: null,
        submitted_at: null,
        obtained_at: null,
        responsible_id: null,
        version: 1,
        label,
        onedrive_item_id: uploaded.id,
        created_by: user.id,
      });
    } catch (insertError) {
      await deleteFileById(uploaded.id).catch(() => {});
      throw insertError;
    }

    const locale = await getLocale();
    revalidatePath(`/${locale}/documents`);
    revalidatePath(`/${locale}/projects/${projectId}`);

    return { success: "documentCreated" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function deleteDocumentAction(
  id: number,
  projectId?: number,
): Promise<ActionState> {
  try {
    const { supabase } = await requireAuth();
    const api = createSupabaseDocumentsClient(supabase);
    const { onedrive_item_id } = await documentService.deleteDocument(api, id);

    if (onedrive_item_id) {
      const { deleteFileById } = await import("@/core/microsoft/folderProvider");
      await deleteFileById(onedrive_item_id).catch(() => {});
    }

    const locale = await getLocale();
    revalidatePath(`/${locale}/documents`);
    if (projectId) revalidatePath(`/${locale}/projects/${projectId}`);

    return { success: "documentDeleted" };
  } catch {
    return { error: "errorGeneric" };
  }
}
