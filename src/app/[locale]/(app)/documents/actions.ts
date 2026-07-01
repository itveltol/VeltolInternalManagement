"use server";

import { createClient } from "@/core/supabase/server";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseDocumentsClient } from "@/features/documents/api/supabaseDocumentsClient";
import * as documentService from "@/features/documents/services/documentService";
import type { Document } from "@/features/documents/types";

export type ActionState = { error?: string; success?: string } | null;

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

export async function getDocuments(search?: string): Promise<Document[]> {
  const { supabase } = await requireAuth();
  const api = createSupabaseDocumentsClient(supabase);
  return documentService.getDocuments(api, search ? { search } : undefined);
}

export async function createDocumentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireMutator();
    const api = createSupabaseDocumentsClient(supabase);

    const name = ((formData.get("name") as string) ?? "").trim();
    const url  = ((formData.get("url") as string) ?? "").trim();
    const linkedType = (formData.get("linked_type") as string) ?? "";
    const linkedId   = (formData.get("linked_id") as string) ?? "";
    const projectIdRaw = formData.get("project_id");
    const projectId = projectIdRaw && String(projectIdRaw).trim() !== "" ? Number(projectIdRaw) : null;
    const isRenewable = formData.get("is_renewable") === "on";
    const expiresAtRaw = ((formData.get("expires_at") as string) ?? "").trim();
    const expiresAt = isRenewable && expiresAtRaw ? expiresAtRaw : null;

    if (!name || !url || !linkedType || !linkedId) return { error: "errorGeneric" };

    await documentService.createDocument(api, {
      name,
      url,
      linked_type: linkedType as never,
      linked_id: linkedId,
      project_id: projectId,
      is_renewable: isRenewable,
      expires_at: expiresAt,
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

export async function deleteDocumentAction(
  id: number,
  projectId?: number,
): Promise<ActionState> {
  try {
    const { supabase } = await requireAuth();
    const api = createSupabaseDocumentsClient(supabase);
    await documentService.deleteDocument(api, id);

    const locale = await getLocale();
    revalidatePath(`/${locale}/documents`);
    if (projectId) revalidatePath(`/${locale}/projects/${projectId}`);

    return { success: "documentDeleted" };
  } catch {
    return { error: "errorGeneric" };
  }
}
