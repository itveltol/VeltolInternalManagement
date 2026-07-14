import { create } from "zustand";
import type { Team } from "../types";

interface TeamsStore {
  isAddDialogOpen: boolean;
  editingTeam: Team | null;
  deletingId: number | null;
  openAddDialog: () => void;
  closeAddDialog: () => void;
  openEditDialog: (team: Team) => void;
  closeEditDialog: () => void;
  setDeletingId: (id: number | null) => void;
}

export const useTeamsStore = create<TeamsStore>()((set) => ({
  isAddDialogOpen: false,
  editingTeam: null,
  deletingId: null,
  openAddDialog: () => set({ isAddDialogOpen: true }),
  closeAddDialog: () => set({ isAddDialogOpen: false }),
  openEditDialog: (team) => set({ editingTeam: team }),
  closeEditDialog: () => set({ editingTeam: null }),
  setDeletingId: (id) => set({ deletingId: id }),
}));
