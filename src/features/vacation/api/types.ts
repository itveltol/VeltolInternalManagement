import type { VacationRequest } from "../types";

export interface CreateVacationPayload {
  user_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
}

export interface UpdateVacationPayload {
  start_date: string;
  end_date: string;
  reason: string | null;
}

export interface VacationApiClient {
  getRequests(userId: string, isAdmin: boolean): Promise<VacationRequest[]>;
  createRequest(payload: CreateVacationPayload): Promise<{ id: number }>;
  updateRequest(id: number, payload: UpdateVacationPayload): Promise<void>;
  cancelRequest(id: number, userId: string): Promise<void>;
  approveRequest(id: number, approverId: string): Promise<void>;
  rejectRequest(id: number, approverId: string): Promise<void>;
}
