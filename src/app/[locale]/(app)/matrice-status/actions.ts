"use server";

import { createClient } from "@/core/supabase/server";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseMatriceClient } from "@/features/matrice/api/supabaseMatriceClient";
import * as matriceService from "@/features/matrice/services/matriceService";
import type { Activity, MatrixData, MatrixProject, ActivityStatus } from "@/features/matrice/types";

export type ActionState = { error?: string; success?: string } | null;

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");
  return { supabase, user };
}

export async function getMatrixData(projectIds: number[]): Promise<MatrixData> {
  const { supabase } = await requireAuth();
  const client = createSupabaseMatriceClient(supabase);
  return matriceService.getMatrix(client, projectIds);
}

export async function getAvailableProjects(): Promise<MatrixProject[]> {
  const { supabase } = await requireAuth();
  const client = createSupabaseMatriceClient(supabase);
  return matriceService.getAllProjects(client);
}

export async function getActivities(): Promise<Activity[]> {
  const { supabase } = await requireAuth();
  const client = createSupabaseMatriceClient(supabase);
  return client.getActivities();
}

export async function setCellStatus(
  projectId: number,
  activityId: number,
  status: ActivityStatus,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireAuth();
    const client = createSupabaseMatriceClient(supabase);
    await matriceService.setCellStatus(client, projectId, activityId, status, user.id);
    const locale = await getLocale();
    revalidatePath(`/${locale}/matrice-status`);
    return { success: "saved" };
  } catch {
    return { error: "errorGeneric" };
  }
}
