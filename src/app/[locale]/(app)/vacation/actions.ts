"use server";

import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { createAdminClient } from "@/core/supabase/admin";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseVacationClient } from "@/features/vacation/api/supabaseVacationClient";
import * as vacationService from "@/features/vacation/services/vacationService";
import * as vacationBalanceService from "@/features/vacation/services/vacationBalanceService";
import { createSupabaseHolidaysClient } from "@/features/holidays/api/supabaseHolidaysClient";
import * as holidayService from "@/features/holidays/services/holidayService";
import { createSupabaseScheduleClient } from "@/features/schedule/api/supabaseScheduleClient";
import * as scheduleService from "@/features/schedule/services/scheduleService";
import { createSupabaseCommsClient } from "@/features/comms/api/supabaseCommsClient";
import type { VacationRequest, VacationBalance, VacationLeaveType } from "@/features/vacation/types";
import { VACATION_LEAVE_TYPES, workingDaysCount } from "@/features/vacation/types";
import type { Holiday } from "@/features/holidays/types";

export type ActionState = { error?: string; success?: string } | null;

async function getVacationPath() {
  const locale = await getLocale();
  return `/${locale}/vacation`;
}

async function requireAuth() {
  const { supabase, user } = await getSessionUser();
  if (!user) throw new Error("Unauthenticated");
  return { supabase, user };
}

async function requireAdmin() {
  const { supabase, user, role } = await getUserProfileRole();
  if (!user) throw new Error("Unauthenticated");
  if (role !== "admin") throw new Error("Forbidden");
  return { supabase, user };
}

async function requireMutator() {
  const { supabase, user, role } = await getUserProfileRole();
  if (!user) throw new Error("Unauthenticated");
  if (!["admin", "project_manager"].includes(role ?? "")) throw new Error("Forbidden");
  return { supabase, user };
}

function fullName(p: { first_name: string | null; last_name: string | null } | null | undefined): string {
  if (!p) return "";
  return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
}

// notifications has no insert policy for regular users (writes come only
// from trigger functions or the service-role key), so this must go through
// the admin client. Never let a notification failure block the approval
// it's attached to.
async function notifyScheduleConflictOnApprove(request: VacationRequest) {
  try {
    const scheduleClient = createSupabaseScheduleClient(createAdminClient());
    const conflicts = await scheduleService.findAssignmentConflicts(
      scheduleClient,
      { profileId: request.user_id, teamWorkerId: request.team_worker_id },
      request.start_date,
      request.end_date,
    );
    if (conflicts.length === 0) return;
    const commsClient = createSupabaseCommsClient(createAdminClient());
    const workerName = request.teamWorker ? fullName(request.teamWorker) : fullName(request.requester);
    for (const c of conflicts) {
      if (!c.pmId) continue;
      await commsClient.createNotification({
        profileId: c.pmId,
        type: "schedule_conflict",
        projectId: c.projectId,
        payload: {
          projectName: c.projectName,
          workerName,
          conflictStart: request.start_date,
          conflictEnd: request.end_date,
          kind: "vacation_over_assignment",
          snippet: `${workerName} was scheduled on ${c.projectName} during approved leave`,
        },
        href: c.projectId ? `/projects/${c.projectId}` : "/schedule",
      });
    }
  } catch (e) {
    console.error("notifyScheduleConflictOnApprove failed:", e);
  }
}

export async function getVacationRequests(): Promise<VacationRequest[]> {
  const { supabase, user, role } = await getUserProfileRole();
  if (!user) throw new Error("Unauthenticated");
  const isAdmin = role === "admin";
  const client = createSupabaseVacationClient(supabase);
  return vacationService.getRequests(client, user.id, isAdmin);
}

export async function getHolidays(): Promise<Holiday[]> {
  const { supabase } = await requireAuth();
  const client = createSupabaseHolidaysClient(supabase);
  return holidayService.getHolidays(client);
}

async function getHolidayDates(): Promise<string[]> {
  const holidays = await getHolidays();
  return holidays.map((h) => h.date);
}

export async function getVacationBalance(userId?: string): Promise<VacationBalance | null> {
  try {
    const { supabase, user } = await requireAuth();
    const targetUserId = userId ?? user.id;
    if (targetUserId !== user.id) await requireAdmin();
    const client = createSupabaseVacationClient(supabase);
    const requests = await client.getRequestsForUser(targetUserId);
    const holidayDates = await getHolidayDates();
    return vacationBalanceService.computeBalance(
      requests,
      targetUserId,
      new Date().getFullYear(),
      new Set(holidayDates),
    );
  } catch {
    return null;
  }
}

function parseLeaveType(formData: FormData): VacationLeaveType {
  const value = formData.get("leave_type") as string | null;
  return VACATION_LEAVE_TYPES.includes(value as VacationLeaveType)
    ? (value as VacationLeaveType)
    : "rest";
}

export async function createVacationRequest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireAuth();
    const requestedUserId = (formData.get("user_id") as string | null)?.trim();
    const isAdminAssign = !!requestedUserId;
    if (isAdminAssign) await requireAdmin();
    const targetUserId = requestedUserId || user.id;

    const client = createSupabaseVacationClient(supabase);
    const start_date = formData.get("start_date") as string;
    const end_date = formData.get("end_date") as string;
    const reason = (formData.get("reason") as string | null)?.trim() || null;
    const leave_type = parseLeaveType(formData);
    const job_title = (formData.get("job_title") as string | null)?.trim() || null;
    const superior_name = (formData.get("superior_name") as string | null)?.trim() || null;
    const substitute_name = (formData.get("substitute_name") as string | null)?.trim() || null;

    const holidayDates = await getHolidayDates();
    if (workingDaysCount(start_date, end_date, new Set(holidayDates)) < 1) {
      return { error: "errorNoWorkingDays" };
    }

    await vacationService.createRequest(client, {
      user_id: targetUserId,
      start_date,
      end_date,
      reason,
      leave_type,
      job_title,
      superior_name,
      substitute_name,
      ...(isAdminAssign && {
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      }),
    });
    revalidatePath(await getVacationPath());
    return { success: "requestCreated" };
  } catch (e: unknown) {
    console.error("createVacationRequest failed:", e);
    return { error: "errorGeneric" };
  }
}

export async function updateVacationRequest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireAuth();
    const client = createSupabaseVacationClient(supabase);
    const id = Number(formData.get("id"));
    const start_date = formData.get("start_date") as string;
    const end_date = formData.get("end_date") as string;
    const reason = (formData.get("reason") as string | null)?.trim() || null;
    const leave_type = parseLeaveType(formData);
    const job_title = (formData.get("job_title") as string | null)?.trim() || null;
    const superior_name = (formData.get("superior_name") as string | null)?.trim() || null;
    const substitute_name = (formData.get("substitute_name") as string | null)?.trim() || null;

    // Verify ownership before updating
    const requests = await vacationService.getRequests(client, user.id, false);
    const request = requests.find((r) => r.id === id);
    if (!request || !vacationService.canEdit(request, user.id)) {
      return { error: "errorNotAllowed" };
    }

    const holidayDates = await getHolidayDates();
    if (workingDaysCount(start_date, end_date, new Set(holidayDates)) < 1) {
      return { error: "errorNoWorkingDays" };
    }

    await vacationService.updateRequest(client, id, {
      start_date,
      end_date,
      reason,
      leave_type,
      job_title,
      superior_name,
      substitute_name,
    });
    revalidatePath(await getVacationPath());
    return { success: "requestSaved" };
  } catch {
    return { error: "errorGeneric" };
  }
}

export async function cancelVacationRequest(id: number): Promise<ActionState> {
  try {
    const { supabase, user } = await requireAuth();
    const client = createSupabaseVacationClient(supabase);
    await vacationService.cancelRequest(client, id, user.id);
    revalidatePath(await getVacationPath());
    return { success: "requestCancelled" };
  } catch {
    return { error: "errorGeneric" };
  }
}

export async function approveVacationRequest(id: number): Promise<ActionState> {
  try {
    const { supabase, user } = await requireAdmin();
    const client = createSupabaseVacationClient(supabase);
    const request = await client.getById(id);
    await vacationService.approveRequest(client, id, user.id);
    revalidatePath(await getVacationPath());
    if (request) await notifyScheduleConflictOnApprove(request);
    return { success: "requestApproved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function logWorkerAbsenceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireMutator();
    const client = createSupabaseVacationClient(supabase);
    const team_worker_id = Number(formData.get("team_worker_id"));
    const start_date = formData.get("start_date") as string;
    const end_date = formData.get("end_date") as string;
    const reason = (formData.get("reason") as string | null)?.trim() || null;

    const holidayDates = await getHolidayDates();
    if (workingDaysCount(start_date, end_date, new Set(holidayDates)) < 1) {
      return { error: "errorNoWorkingDays" };
    }

    const { id } = await client.logWorkerAbsence({ team_worker_id, start_date, end_date, reason, approved_by: user.id });
    revalidatePath(await getVacationPath());
    const created = await client.getById(id);
    if (created) await notifyScheduleConflictOnApprove(created);
    return { success: "requestCreated" };
  } catch (e: unknown) {
    console.error("logWorkerAbsenceAction failed:", e);
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function rejectVacationRequest(id: number): Promise<ActionState> {
  try {
    const { supabase, user } = await requireAdmin();
    const client = createSupabaseVacationClient(supabase);
    await vacationService.rejectRequest(client, id, user.id);
    revalidatePath(await getVacationPath());
    return { success: "requestRejected" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}
