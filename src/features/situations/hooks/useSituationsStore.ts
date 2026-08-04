import { create } from "zustand";
import type { Situation } from "../types";

interface SituationsStore {
  isAddDialogOpen: boolean;
  editingSituation: Situation | null;
  deletingId: number | null;
  openSituationId: number | null;
  openAddDialog: () => void;
  closeAddDialog: () => void;
  openEditDialog: (situation: Situation) => void;
  closeEditDialog: () => void;
  setDeletingId: (id: number | null) => void;
  openSituation: (id: number) => void;
  closeSituation: () => void;
}

export const useSituationsStore = create<SituationsStore>()((set) => ({
  isAddDialogOpen: false,
  editingSituation: null,
  deletingId: null,
  openSituationId: null,
  openAddDialog: () => set({ isAddDialogOpen: true }),
  closeAddDialog: () => set({ isAddDialogOpen: false }),
  openEditDialog: (situation) => set({ editingSituation: situation }),
  closeEditDialog: () => set({ editingSituation: null }),
  setDeletingId: (id) => set({ deletingId: id }),
  openSituation: (id) => set({ openSituationId: id }),
  closeSituation: () => set({ openSituationId: null }),
}));
