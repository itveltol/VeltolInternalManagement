import { create } from "zustand";

interface TeamsStore {
  isAddDialogOpen: boolean;
  deletingId: number | null;
  openAddDialog: () => void;
  closeAddDialog: () => void;
  setDeletingId: (id: number | null) => void;
}

export const useTeamsStore = create<TeamsStore>()((set) => ({
  isAddDialogOpen: false,
  deletingId: null,
  openAddDialog: () => set({ isAddDialogOpen: true }),
  closeAddDialog: () => set({ isAddDialogOpen: false }),
  setDeletingId: (id) => set({ deletingId: id }),
}));
