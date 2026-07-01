import { create } from "zustand";
import type { Client } from "../types";

interface ClientsStore {
  isAddDialogOpen: boolean;
  editingClient: Client | null;
  deletingId: number | null;
  openAddDialog: () => void;
  closeAddDialog: () => void;
  openEditDialog: (client: Client) => void;
  closeEditDialog: () => void;
  setDeletingId: (id: number | null) => void;
}

export const useClientsStore = create<ClientsStore>()((set) => ({
  isAddDialogOpen: false,
  editingClient: null,
  deletingId: null,
  openAddDialog: () => set({ isAddDialogOpen: true }),
  closeAddDialog: () => set({ isAddDialogOpen: false }),
  openEditDialog: (client) => set({ editingClient: client }),
  closeEditDialog: () => set({ editingClient: null }),
  setDeletingId: (id) => set({ deletingId: id }),
}));
