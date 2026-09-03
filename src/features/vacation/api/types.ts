import type { VacationRequest, VacationLeaveType, VacationStatus } from "../types";

export interface CreateVacationPayload {
  user_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  leave_type: VacationLeaveType;
  job_title: string | null;
  superior_name: string | null;
  substitute_name: string | null;
  status?: VacationStatus;
  approved_by?: string;
  approved_at?: string;
}

export interface UpdateVacationPayload {
  start_date: string;
  end_date: string;
  reason: string | null;
  leave_type: VacationLeaveType;
  job_title: string | null;
  superior_name: string | null;
  substitute_name: string | null;
}

/** A team_worker (no-login outfield worker) absence, logged directly by a PM/admin — always pre-approved. */
export interface LogWorkerAbsencePayload {
  team_worker_id: number;
  start_date: string;
  end_date: string;
  reason: string | null;
  approved_by: string;
}

export interface VacationApiClient {
  getRequests(userId: string, isAdmin: boolean): Promise<VacationRequest[]>;
  getRequestsForUser(userId: string): Promise<VacationRequest[]>;
  getById(id: number): Promise<VacationRequest | null>;
  createRequest(payload: CreateVacationPayload): Promise<{ id: number }>;
  updateRequest(id: number, payload: UpdateVacationPayload): Promise<void>;
  cancelRequest(id: number, userId: string): Promise<void>;
  approveRequest(id: number, approverId: string): Promise<void>;
  rejectRequest(id: number, approverId: string): Promise<void>;
  logWorkerAbsence(payload: LogWorkerAbsencePayload): Promise<{ id: number }>;
  /** Approved requests (profile or team_worker) overlapping [rangeStart, rangeEnd], for schedule grey-out/conflict checks. */
  getApprovedOverlapping(
    profileIds: string[],
    teamWorkerIds: number[],
    rangeStart: string,
    rangeEnd: string,
  ): Promise<Array<{ user_id: string | null; team_worker_id: number | null; start_date: string; end_date: string }>>;
}
