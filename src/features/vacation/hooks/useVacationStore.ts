import { create } from "zustand";
import type { VacationRequest } from "../types";

interface VacationStore {
  isAddDialogOpen: boolean;
  editingRequest: VacationRequest | null;
  approvingRequest: VacationRequest | null;
  openAddDialog: () => void;
  closeAddDialog: () => void;
  openEditDialog: (request: VacationRequest) => void;
  closeEditDialog: () => void;
  openApprovalDialog: (request: VacationRequest) => void;
  closeApprovalDialog: () => void;
}

export const useVacationStore = create<VacationStore>()((set) => ({
  isAddDialogOpen: false,
  editingRequest: null,
  approvingRequest: null,
  openAddDialog: () => set({ isAddDialogOpen: true }),
  closeAddDialog: () => set({ isAddDialogOpen: false }),
  openEditDialog: (request) => set({ editingRequest: request }),
  closeEditDialog: () => set({ editingRequest: null }),
  openApprovalDialog: (request) => set({ approvingRequest: request }),
  closeApprovalDialog: () => set({ approvingRequest: null }),
}));
