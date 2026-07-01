import { create } from 'zustand';
import type { DocumentLinkedType, Document } from '../types';

export interface DocumentDialogContext {
  linkedType: DocumentLinkedType;
  linkedId: string;
  projectId: number | null;
  contextLabel: string;
}

export interface ResponsibleProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface DocumentsStore {
  addContext: DocumentDialogContext | null;
  openAddDialog: (ctx: DocumentDialogContext) => void;
  closeAddDialog: () => void;
  editingDocument: Document | null;
  openEditDialog: (doc: Document) => void;
  closeEditDialog: () => void;
  deletingId: number | null;
  setDeletingId: (id: number | null) => void;
  responsibleProfiles: ResponsibleProfile[];
  setResponsibleProfiles: (profiles: ResponsibleProfile[]) => void;
}

export const useDocumentsStore = create<DocumentsStore>()((set) => ({
  addContext: null,
  openAddDialog: (ctx) => set({ addContext: ctx }),
  closeAddDialog: () => set({ addContext: null }),
  editingDocument: null,
  openEditDialog: (doc) => set({ editingDocument: doc }),
  closeEditDialog: () => set({ editingDocument: null }),
  deletingId: null,
  setDeletingId: (id) => set({ deletingId: id }),
  responsibleProfiles: [],
  setResponsibleProfiles: (profiles) => set({ responsibleProfiles: profiles }),
}));
