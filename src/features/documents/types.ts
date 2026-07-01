export type DocumentLinkedType = 'project' | 'client' | 'matrice_cell' | 'checklist_item';

export interface Document {
  id: number;
  name: string;
  url: string;
  linked_type: DocumentLinkedType;
  linked_id: string;
  project_id: number | null;
  created_by: string;
  created_at: string;
  is_renewable: boolean;
  expires_at: string | null;
  creator?: { first_name: string | null; last_name: string | null } | null;
  project?: { id: number; name: string } | null;
}

export interface CreateDocumentPayload {
  name: string;
  url: string;
  linked_type: DocumentLinkedType;
  linked_id: string;
  project_id: number | null;
  is_renewable: boolean;
  expires_at: string | null;
}
