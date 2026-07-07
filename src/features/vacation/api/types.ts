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

export interface VacationApiClient {
  getRequests(userId: string, isAdmin: boolean): Promise<VacationRequest[]>;
  getRequestsForUser(userId: string): Promise<VacationRequest[]>;
  createRequest(payload: CreateVacationPayload): Promise<{ id: number }>;
  updateRequest(id: number, payload: UpdateVacationPayload): Promise<void>;
  cancelRequest(id: number, userId: string): Promise<void>;
  approveRequest(id: number, approverId: string): Promise<void>;
  rejectRequest(id: number, approverId: string): Promise<void>;
}
