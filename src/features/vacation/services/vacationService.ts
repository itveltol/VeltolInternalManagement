import type { VacationApiClient, CreateVacationPayload, UpdateVacationPayload } from "../api/types";
import type { VacationRequest } from "../types";

export async function getRequests(
  client: VacationApiClient,
  userId: string,
  isAdmin: boolean,
): Promise<VacationRequest[]> {
  return client.getRequests(userId, isAdmin);
}

export async function createRequest(
  client: VacationApiClient,
  payload: CreateVacationPayload,
): Promise<{ id: number }> {
  return client.createRequest(payload);
}

export async function updateRequest(
  client: VacationApiClient,
  id: number,
  payload: UpdateVacationPayload,
): Promise<void> {
  return client.updateRequest(id, payload);
}

export async function cancelRequest(
  client: VacationApiClient,
  id: number,
  userId: string,
): Promise<void> {
  return client.cancelRequest(id, userId);
}

export async function approveRequest(
  client: VacationApiClient,
  id: number,
  approverId: string,
): Promise<void> {
  return client.approveRequest(id, approverId);
}

export async function rejectRequest(
  client: VacationApiClient,
  id: number,
  approverId: string,
): Promise<void> {
  return client.rejectRequest(id, approverId);
}

export function canEdit(request: VacationRequest, userId: string): boolean {
  return request.status === "pending" && request.user_id === userId;
}
