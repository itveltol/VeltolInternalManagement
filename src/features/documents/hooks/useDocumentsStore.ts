import { create } from 'zustand';
import type { DocumentLinkedType } from '../types';

export interface DocumentDialogContext {
  linkedType: DocumentLinkedType;
  linkedId: string;
  projectId: number | null;
  contextLabel: string;
}

interface DocumentsStore {
  addContext: DocumentDialogContext | null;
  openAddDialog: (ctx: DocumentDialogContext) => void;
  closeAddDialog: () => void;
  deletingId: number | null;
  setDeletingId: (id: number | null) => void;
}

export const useDocumentsStore = create<DocumentsStore>()((set) => ({
  addContext: null,
  openAddDialog: (ctx) => set({ addContext: ctx }),
  closeAddDialog: () => set({ addContext: null }),
  deletingId: null,
  setDeletingId: (id) => set({ deletingId: id }),
}));
