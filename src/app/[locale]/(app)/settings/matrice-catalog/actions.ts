"use server";

import { getUserProfileRole } from "@/core/supabase/session";
import { revalidatePath, updateTag } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseMatriceAdminClient } from "@/features/matriceAdmin/api/supabaseMatriceAdminClient";
import { DependencyCycleError } from "@/features/matriceAdmin/api/types";
import * as matriceAdminService from "@/features/matriceAdmin/services/matriceAdminService";
import type { MatriceCatalog } from "@/features/matriceAdmin/types";
import type { ContractType } from "@/features/projects/types";
import type { GanttPhaseKey } from "@/features/gantt/types";

export type ActionState = { error?: string; success?: string } | null;

async function requireAdmin() {
  const { supabase, user, role } = await getUserProfileRole();
  if (!user) throw new Error("Unauthenticated");
  if (role !== "admin") throw new Error("Forbidden");
  return { supabase, user };
}

async function getCatalogPath() {
  const locale = await getLocale();
  return `/${locale}/settings/matrice-catalog`;
}

function afterMutation(path: string) {
  updateTag("activities");
  revalidatePath(path);
}

export async function getCatalog(): Promise<MatriceCatalog> {
  const { supabase } = await requireAdmin();
  const client = createSupabaseMatriceAdminClient(supabase);
  return matriceAdminService.getCatalog(client);
}

function mapError(e: unknown): ActionState {
  if (e instanceof DependencyCycleError) return { error: "errorDependencyCycle" };
  if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
  return { error: "errorGeneric" };
}

export async function createPhase(
  name: string,
  serviceType: ContractType,
  ganttPhaseKey: GanttPhaseKey | null,
): Promise<ActionState> {
  try {
    const { supabase } = await requireAdmin();
    const client = createSupabaseMatriceAdminClient(supabase);
    const phases = await client.getPhases();
    await client.createPhase({
      name,
      sort_order: matriceAdminService.nextPhaseSortOrder(phases),
      service_type: serviceType,
      gantt_phase_key: ganttPhaseKey,
    });
    afterMutation(await getCatalogPath());
    return { success: "saved" };
  } catch (e: unknown) {
    return mapError(e);
  }
}

export async function renamePhase(id: number, name: string): Promise<ActionState> {
  try {
    const { supabase } = await requireAdmin();
    await createSupabaseMatriceAdminClient(supabase).renamePhase(id, name);
    afterMutation(await getCatalogPath());
    return { success: "saved" };
  } catch (e: unknown) {
    return mapError(e);
  }
}

export async function updatePhaseGating(
  id: number,
  serviceType: ContractType,
  ganttPhaseKey: GanttPhaseKey | null,
): Promise<ActionState> {
  try {
    const { supabase } = await requireAdmin();
    await createSupabaseMatriceAdminClient(supabase).updatePhaseGating(id, serviceType, ganttPhaseKey);
    afterMutation(await getCatalogPath());
    return { success: "saved" };
  } catch (e: unknown) {
    return mapError(e);
  }
}

export async function reorderPhase(id: number, direction: "up" | "down"): Promise<ActionState> {
  try {
    const { supabase } = await requireAdmin();
    const client = createSupabaseMatriceAdminClient(supabase);
    const phases = await client.getPhases();
    const swap = matriceAdminService.computeAdjacentSwap(phases, id, direction);
    if (!swap) return { error: "errorGeneric" };
    const [a, b] = swap;
    await Promise.all([
      client.updatePhaseSortOrder(a.id, b.sort_order),
      client.updatePhaseSortOrder(b.id, a.sort_order),
    ]);
    afterMutation(await getCatalogPath());
    return { success: "saved" };
  } catch (e: unknown) {
    return mapError(e);
  }
}

export async function deletePhase(id: number): Promise<ActionState> {
  try {
    const { supabase } = await requireAdmin();
    await createSupabaseMatriceAdminClient(supabase).deletePhase(id);
    afterMutation(await getCatalogPath());
    return { success: "saved" };
  } catch (e: unknown) {
    return mapError(e);
  }
}

export async function createActivity(
  phaseId: number,
  name: string,
  isSectionHeader: boolean,
): Promise<ActionState> {
  try {
    const { supabase } = await requireAdmin();
    const client = createSupabaseMatriceAdminClient(supabase);
    const activities = await client.getActivities();
    await client.createActivity({
      phase_id: phaseId,
      name,
      sort_order: matriceAdminService.nextSortOrderForPhase(activities, phaseId),
      is_section_header: isSectionHeader,
    });
    afterMutation(await getCatalogPath());
    return { success: "saved" };
  } catch (e: unknown) {
    return mapError(e);
  }
}

export async function renameActivity(id: number, name: string): Promise<ActionState> {
  try {
    const { supabase } = await requireAdmin();
    await createSupabaseMatriceAdminClient(supabase).renameActivity(id, name);
    afterMutation(await getCatalogPath());
    return { success: "saved" };
  } catch (e: unknown) {
    return mapError(e);
  }
}

export async function reorderActivity(id: number, direction: "up" | "down"): Promise<ActionState> {
  try {
    const { supabase } = await requireAdmin();
    const client = createSupabaseMatriceAdminClient(supabase);
    const activities = await client.getActivities();
    const activity = activities.find((a) => a.id === id);
    if (!activity) return { error: "errorGeneric" };
    const inPhase = activities
      .filter((a) => a.phase_id === activity.phase_id)
      .sort((a, b) => a.sort_order - b.sort_order);
    const swap = matriceAdminService.computeAdjacentSwap(inPhase, id, direction);
    if (!swap) return { error: "errorGeneric" };
    const [a, b] = swap;
    await Promise.all([
      client.updateActivitySortOrder(a.id, b.sort_order),
      client.updateActivitySortOrder(b.id, a.sort_order),
    ]);
    afterMutation(await getCatalogPath());
    return { success: "saved" };
  } catch (e: unknown) {
    return mapError(e);
  }
}

export async function moveActivityToPhase(id: number, phaseId: number): Promise<ActionState> {
  try {
    const { supabase } = await requireAdmin();
    const client = createSupabaseMatriceAdminClient(supabase);
    const activities = await client.getActivities();
    const sortOrder = matriceAdminService.nextSortOrderForPhase(activities, phaseId);
    await client.moveActivityToPhase(id, phaseId, sortOrder);
    afterMutation(await getCatalogPath());
    return { success: "saved" };
  } catch (e: unknown) {
    return mapError(e);
  }
}

export async function setActivityExpiresRequired(id: number, expiresRequired: boolean): Promise<ActionState> {
  try {
    const { supabase } = await requireAdmin();
    await createSupabaseMatriceAdminClient(supabase).setActivityExpiresRequired(id, expiresRequired);
    afterMutation(await getCatalogPath());
    return { success: "saved" };
  } catch (e: unknown) {
    return mapError(e);
  }
}

export async function deleteActivity(id: number): Promise<ActionState> {
  try {
    const { supabase } = await requireAdmin();
    await createSupabaseMatriceAdminClient(supabase).deleteActivity(id);
    afterMutation(await getCatalogPath());
    return { success: "saved" };
  } catch (e: unknown) {
    return mapError(e);
  }
}

export async function addActivityDependency(activityId: number, dependsOnActivityId: number): Promise<ActionState> {
  try {
    const { supabase } = await requireAdmin();
    await createSupabaseMatriceAdminClient(supabase).addDependency(activityId, dependsOnActivityId);
    afterMutation(await getCatalogPath());
    return { success: "saved" };
  } catch (e: unknown) {
    return mapError(e);
  }
}

export async function removeActivityDependency(activityId: number, dependsOnActivityId: number): Promise<ActionState> {
  try {
    const { supabase } = await requireAdmin();
    await createSupabaseMatriceAdminClient(supabase).removeDependency(activityId, dependsOnActivityId);
    afterMutation(await getCatalogPath());
    return { success: "saved" };
  } catch (e: unknown) {
    return mapError(e);
  }
}
