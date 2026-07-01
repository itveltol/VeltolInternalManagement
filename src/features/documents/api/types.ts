import type { Document, CreateDocumentPayload } from '../types';

export interface GetDocumentsFilter {
  project_id?: number;
  linked_type?: string;
  linked_id?: string;
  search?: string;
}

export interface DocumentsApiClient {
  getDocuments(filter?: GetDocumentsFilter): Promise<Document[]>;
  getDocumentsByProject(projectId: number): Promise<Document[]>;
  getDocumentsByLinkedId(linkedType: string, linkedId: string): Promise<Document[]>;
  createDocument(payload: CreateDocumentPayload & { created_by: string }): Promise<{ id: number }>;
  deleteDocument(id: number): Promise<void>;
}
