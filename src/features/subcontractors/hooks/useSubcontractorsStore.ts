import { create } from "zustand";
import type { Subcontractor } from "../types";

interface SubcontractorsStore {
  isAddDialogOpen: boolean;
  editingSubcontractor: Subcontractor | null;
  deletingId: number | null;
  openAddDialog: () => void;
  closeAddDialog: () => void;
  openEditDialog: (subcontractor: Subcontractor) => void;
  closeEditDialog: () => void;
  setDeletingId: (id: number | null) => void;
}

export const useSubcontractorsStore = create<SubcontractorsStore>()((set) => ({
  isAddDialogOpen: false,
  editingSubcontractor: null,
  deletingId: null,
  openAddDialog: () => set({ isAddDialogOpen: true }),
  closeAddDialog: () => set({ isAddDialogOpen: false }),
  openEditDialog: (subcontractor) => set({ editingSubcontractor: subcontractor }),
  closeEditDialog: () => set({ editingSubcontractor: null }),
  setDeletingId: (id) => set({ deletingId: id }),
}));
