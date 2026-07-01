import type { Document, CreateDocumentPayload, UpdateDocumentPayload, DocumentCategory, DocumentStatus } from '../types';

export interface GetDocumentsFilter {
  project_id?: number;
  linked_type?: string;
  linked_id?: string;
  search?: string;
  category?: DocumentCategory;
  status?: DocumentStatus;
}

export interface DocumentsApiClient {
  getDocuments(filter?: GetDocumentsFilter): Promise<Document[]>;
  getDocumentsByProject(projectId: number): Promise<Document[]>;
  getDocumentsByLinkedId(linkedType: string, linkedId: string): Promise<Document[]>;
  getResponsibleProfiles(): Promise<{ id: string; first_name: string | null; last_name: string | null }[]>;
  createDocument(payload: CreateDocumentPayload & { created_by: string }): Promise<{ id: number }>;
  updateDocument(id: number, payload: UpdateDocumentPayload): Promise<void>;
  deleteDocument(id: number): Promise<void>;
}
