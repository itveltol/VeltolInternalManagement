import { create } from 'zustand';
import type { DocumentLinkedType, Document } from '../types';

export interface DocumentDialogContext {
  linkedType: DocumentLinkedType;
  linkedId: string;
  projectId: number | null;
  contextLabel: string;
  label?: string | null;
}

export interface ResponsibleProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface DocumentsStore {
  addContext: DocumentDialogContext | null;
  onAddSuccess: (() => void) | null;
  openAddDialog: (ctx: DocumentDialogContext, onSuccess?: () => void) => void;
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
  onAddSuccess: null,
  openAddDialog: (ctx, onSuccess) => set({ addContext: ctx, onAddSuccess: onSuccess ?? null }),
  closeAddDialog: () => set({ addContext: null, onAddSuccess: null }),
  editingDocument: null,
  openEditDialog: (doc) => set({ editingDocument: doc }),
  closeEditDialog: () => set({ editingDocument: null }),
  deletingId: null,
  setDeletingId: (id) => set({ deletingId: id }),
  responsibleProfiles: [],
  setResponsibleProfiles: (profiles) => set({ responsibleProfiles: profiles }),
}));
