import { create } from "zustand";
import type { Supplier } from "../types";

interface SuppliersStore {
  isAddDialogOpen: boolean;
  editingSupplier: Supplier | null;
  deletingId: number | null;
  openAddDialog: () => void;
  closeAddDialog: () => void;
  openEditDialog: (supplier: Supplier) => void;
  closeEditDialog: () => void;
  setDeletingId: (id: number | null) => void;
}

export const useSuppliersStore = create<SuppliersStore>()((set) => ({
  isAddDialogOpen: false,
  editingSupplier: null,
  deletingId: null,
  openAddDialog: () => set({ isAddDialogOpen: true }),
  closeAddDialog: () => set({ isAddDialogOpen: false }),
  openEditDialog: (supplier) => set({ editingSupplier: supplier }),
  closeEditDialog: () => set({ editingSupplier: null }),
  setDeletingId: (id) => set({ deletingId: id }),
}));
