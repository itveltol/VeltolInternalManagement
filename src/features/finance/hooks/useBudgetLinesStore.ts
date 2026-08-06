import { create } from "zustand";
import type { ProjectBudgetLine } from "../types";

interface BudgetLinesStore {
  isAddDialogOpen: boolean;
  editingLine: ProjectBudgetLine | null;
  deletingId: number | null;
  openAddDialog: () => void;
  closeAddDialog: () => void;
  openEditDialog: (line: ProjectBudgetLine) => void;
  closeEditDialog: () => void;
  setDeletingId: (id: number | null) => void;
}

export const useBudgetLinesStore = create<BudgetLinesStore>()((set) => ({
  isAddDialogOpen: false,
  editingLine: null,
  deletingId: null,
  openAddDialog: () => set({ isAddDialogOpen: true }),
  closeAddDialog: () => set({ isAddDialogOpen: false }),
  openEditDialog: (line) => set({ editingLine: line }),
  closeEditDialog: () => set({ editingLine: null }),
  setDeletingId: (id) => set({ deletingId: id }),
}));
