import type {
  CefBessDataApiClient,
  UpsertCefDataPayload,
  UpsertBessDataPayload,
} from "../api/types";
import type { ProjectCefData, ProjectBessData } from "@/features/projects/cefBessData/types";

export async function getCefData(
  client: CefBessDataApiClient,
  projectId: number
): Promise<ProjectCefData | null> {
  return client.getCefData(projectId);
}

export async function upsertCefData(
  client: CefBessDataApiClient,
  payload: UpsertCefDataPayload
): Promise<void> {
  return client.upsertCefData(payload);
}

export async function getBessData(
  client: CefBessDataApiClient,
  projectId: number
): Promise<ProjectBessData | null> {
  return client.getBessData(projectId);
}

export async function upsertBessData(
  client: CefBessDataApiClient,
  payload: UpsertBessDataPayload
): Promise<void> {
  return client.upsertBessData(payload);
}
