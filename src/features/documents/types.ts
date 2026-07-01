export type DocumentLinkedType = 'project' | 'client' | 'matrice_cell' | 'checklist_item';

export type DocumentCategory =
  | 'atr'
  | 'cu'
  | 'dtac'
  | 'ac'
  | 'aviz_mediu'
  | 'aviz_isc'
  | 'aviz_anre'
  | 'contract_racordare'
  | 'receptie_terminare'
  | 'other';

export type DocumentStatus = 'pending' | 'submitted' | 'obtained' | 'rejected' | 'expired';

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  'atr', 'cu', 'dtac', 'ac', 'aviz_mediu', 'aviz_isc', 'aviz_anre',
  'contract_racordare', 'receptie_terminare', 'other',
];

export const DOCUMENT_STATUSES: DocumentStatus[] = [
  'pending', 'submitted', 'obtained', 'rejected', 'expired',
];

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
  category: DocumentCategory | null;
  status: DocumentStatus | null;
  submitted_at: string | null;
  obtained_at: string | null;
  responsible_id: string | null;
  version: number;
  creator?: { first_name: string | null; last_name: string | null } | null;
  responsible?: { first_name: string | null; last_name: string | null } | null;
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
  category: DocumentCategory | null;
  status: DocumentStatus | null;
  submitted_at: string | null;
  obtained_at: string | null;
  responsible_id: string | null;
  version: number;
}

export interface UpdateDocumentPayload {
  name?: string;
  url?: string;
  is_renewable?: boolean;
  expires_at?: string | null;
  category?: DocumentCategory | null;
  status?: DocumentStatus | null;
  submitted_at?: string | null;
  obtained_at?: string | null;
  responsible_id?: string | null;
  version?: number;
}
