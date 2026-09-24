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
import { createSupabaseProfileClient } from "@/features/profile/api/supabaseProfileClient";
import * as profileService from "@/features/profile/services/profileService";
import { createSupabaseTeamsClient } from "@/features/teams/api/supabaseTeamsClient";
import * as teamService from "@/features/teams/services/teamService";
import type {
  VacationRequest,
  VacationBalance,
  VacationLeaveType,
  VacationSubject,
  VacationOverviewRow,
} from "@/features/vacation/types";
import { COUNTED_LEAVE_TYPES, VACATION_LEAVE_TYPES, vacationDays, workingDaysCount } from "@/features/vacation/types";
import type { Holiday } from "@/features/holidays/types";

export type ActionState = { error?: string; success?: string } | null;

async function getVacationPath() {
  const locale = await getLocale();
  return `/${locale}/vacation`;
}

async function revalidateBalancePaths() {
  const locale = await getLocale();
  revalidatePath(`/${locale}/vacation`);
  revalidatePath(`/${locale}/profile`);
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

/** Balance for the current year. Defaults to the signed-in user; anyone else requires admin. */
export async function getVacationBalance(subject?: VacationSubject): Promise<VacationBalance | null> {
  try {
    const { supabase, user } = await requireAuth();
    const target: VacationSubject = subject ?? { kind: "user", id: user.id };
    if (target.kind !== "user" || target.id !== user.id) await requireAdmin();
    const client = createSupabaseVacationClient(supabase);
    const [requests, allowances, adjustments, holidayDates] = await Promise.all([
      target.kind === "user" ? client.getRequestsForUser(target.id) : client.getBalanceRows(),
      client.getAllowances(target),
      client.getAdjustments(target),
      getHolidayDates(),
    ]);
    return vacationBalanceService.computeBalance(
      { requests, allowances, adjustments, holidays: new Set(holidayDates) },
      target,
      new Date().getFullYear(),
    );
  } catch {
    return null;
  }
}

function parseYear(value: FormDataEntryValue | null): number | null {
  const year = Number(value);
  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : null;
}

function parseSubject(formData: FormData): VacationSubject | null {
  const kind = formData.get("subject_kind");
  const id = (formData.get("subject_id") as string | null)?.trim();
  if (!id) return null;
  if (kind === "user") return { kind, id };
  if (kind === "team_worker" && Number.isInteger(Number(id))) return { kind, id: Number(id) };
  return null;
}

// Half-day granularity to match numeric(5,1).
function parseDays(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (raw === "") return null;
  const days = Number(raw);
  return Number.isFinite(days) && Math.abs(days) < 1000 ? Math.round(days * 2) / 2 : null;
}

/** Every app user and active team worker with their balance for `year`. Admin only. */
export async function getVacationOverview(year: number): Promise<VacationOverviewRow[]> {
  const { supabase } = await requireAdmin();
  const client = createSupabaseVacationClient(supabase);
  const [users, workers, teams, requests, allowances, adjustments, holidayDates] = await Promise.all([
    profileService.getAllUsers(createSupabaseProfileClient(supabase)),
    teamService.getAllTeamWorkers(createSupabaseTeamsClient(supabase)),
    teamService.getTeams(createSupabaseTeamsClient(supabase)),
    client.getBalanceRows(),
    client.getAllowances(),
    client.getAdjustments(),
    getHolidayDates(),
  ]);
  const holidays = new Set(holidayDates);
  const inputs = { requests, allowances, adjustments, holidays };
  const teamNameById = new Map(teams.map((t) => [t.id, t.name]));

  function row(subject: VacationSubject, name: string, detail: string): VacationOverviewRow {
    const own = (r: { user_id: string | null; team_worker_id: number | null }) =>
      vacationBalanceService.matchesSubject(r, subject);
    return {
      subject,
      name,
      detail,
      balance: vacationBalanceService.computeBalance(inputs, subject, year),
      pendingDays: requests
        .filter(
          (r) =>
            own(r) &&
            r.status === "pending" &&
            COUNTED_LEAVE_TYPES.includes(r.leave_type) &&
            r.start_date.startsWith(`${year}-`),
        )
        .reduce((sum, r) => sum + vacationDays(r.start_date, r.end_date, holidays), 0),
      hasExplicitAllowance: allowances.some((a) => own(a) && a.year === year),
      adjustments: adjustments.filter((a) => own(a) && a.year === year),
    };
  }

  return [
    ...users.map((u) =>
      row({ kind: "user", id: u.id }, fullName(u) || u.email, u.email),
    ),
    ...workers
      .filter((w) => w.active)
      .map((w) =>
        row(
          { kind: "team_worker", id: w.id },
          fullName(w),
          (w.team_id !== null ? teamNameById.get(w.team_id) : null) ?? "",
        ),
      ),
  ].sort((a, b) => a.name.localeCompare(b.name));
}

export async function setVacationAllowance(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireAdmin();
    const subject = parseSubject(formData);
    const year = parseYear(formData.get("year"));
    const baseDays = parseDays(formData.get("base_days"));
    if (!subject || !year || baseDays === null || baseDays < 0) return { error: "errorInvalidAllowance" };
    await createSupabaseVacationClient(supabase).upsertAllowance(subject, year, baseDays);
    await revalidateBalancePaths();
    return { success: "allowanceSaved" };
  } catch (e: unknown) {
    console.error("setVacationAllowance failed:", e);
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function addVacationAdjustment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireAdmin();
    const subject = parseSubject(formData);
    const year = parseYear(formData.get("year"));
    const days = parseDays(formData.get("days"));
    const note = (formData.get("note") as string | null)?.trim() ?? "";
    if (!subject || !year || days === null || days === 0 || !note) return { error: "errorInvalidAdjustment" };
    await createSupabaseVacationClient(supabase).createAdjustment({
      subject,
      year,
      days,
      note,
      created_by: user.id,
    });
    await revalidateBalancePaths();
    return { success: "adjustmentAdded" };
  } catch (e: unknown) {
    console.error("addVacationAdjustment failed:", e);
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function deleteVacationAdjustment(id: number): Promise<ActionState> {
  try {
    const { supabase } = await requireAdmin();
    await createSupabaseVacationClient(supabase).deleteAdjustment(id);
    await revalidateBalancePaths();
    return { success: "adjustmentDeleted" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
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

    if (!start_date || !end_date || end_date < start_date) return { error: "errorInvalidRange" };
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
    if (e instanceof Error && e.message === "Overlap") return { error: "errorOverlap" };
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

    if (!start_date || !end_date || end_date < start_date) return { error: "errorInvalidRange" };
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
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Overlap") return { error: "errorOverlap" };
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
    if (e instanceof Error && e.message === "Overlap") return { error: "errorOverlap" };
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

    if (!start_date || !end_date || end_date < start_date) return { error: "errorInvalidRange" };
    const holidayDates = await getHolidayDates();
    if (workingDaysCount(start_date, end_date, new Set(holidayDates)) < 1) {
      return { error: "errorNoWorkingDays" };
    }

    const { id } = await client.logWorkerAbsence({
      team_worker_id,
      start_date,
      end_date,
      reason,
      leave_type: parseLeaveType(formData),
      approved_by: user.id,
    });
    revalidatePath(await getVacationPath());
    const created = await client.getById(id);
    if (created) await notifyScheduleConflictOnApprove(created);
    return { success: "requestCreated" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Overlap") return { error: "errorOverlap" };
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
