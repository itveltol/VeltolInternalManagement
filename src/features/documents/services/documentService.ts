import type { DocumentsApiClient, GetDocumentsFilter } from '../api/types';
import type { Document, CreateDocumentPayload } from '../types';

export async function getDocuments(api: DocumentsApiClient, filter?: GetDocumentsFilter): Promise<Document[]> {
  return api.getDocuments(filter);
}

export async function getDocumentsByProject(api: DocumentsApiClient, projectId: number): Promise<Document[]> {
  return api.getDocumentsByProject(projectId);
}

export async function getDocumentsByLinkedId(
  api: DocumentsApiClient,
  linkedType: string,
  linkedId: string,
): Promise<Document[]> {
  return api.getDocumentsByLinkedId(linkedType, linkedId);
}

export async function createDocument(
  api: DocumentsApiClient,
  payload: CreateDocumentPayload & { created_by: string },
): Promise<{ id: number }> {
  return api.createDocument(payload);
}

export async function deleteDocument(api: DocumentsApiClient, id: number): Promise<void> {
  return api.deleteDocument(id);
}
