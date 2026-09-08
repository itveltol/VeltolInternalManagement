import { create } from "zustand";
import type { Situation } from "../types";

interface SituationsStore {
  isAddDialogOpen: boolean;
  isAddWithProjectDialogOpen: boolean;
  editingSituation: Situation | null;
  deletingId: number | null;
  /** The contract centralizer row currently drilled into — its contract's
   * situations list is level 2 of the centralizer → situations → detail
   * drill-down. Null means we're at the centralizer (level 1). A project can
   * now have several contracts, so this addresses one specific contract, not
   * the project as a whole. */
  openContractId: number | null;
  openSituationId: number | null;
  editingBillingContractId: number | null;
  openAddDialog: () => void;
  closeAddDialog: () => void;
  openAddWithProjectDialog: () => void;
  closeAddWithProjectDialog: () => void;
  openEditDialog: (situation: Situation) => void;
  closeEditDialog: () => void;
  setDeletingId: (id: number | null) => void;
  openContract: (id: number) => void;
  closeContract: () => void;
  openSituation: (id: number) => void;
  closeSituation: () => void;
  openBillingDialog: (contractId: number) => void;
  closeBillingDialog: () => void;
}

export const useSituationsStore = create<SituationsStore>()((set) => ({
  isAddDialogOpen: false,
  isAddWithProjectDialogOpen: false,
  editingSituation: null,
  deletingId: null,
  openContractId: null,
  openSituationId: null,
  editingBillingContractId: null,
  openAddDialog: () => set({ isAddDialogOpen: true }),
  closeAddDialog: () => set({ isAddDialogOpen: false }),
  openAddWithProjectDialog: () => set({ isAddWithProjectDialogOpen: true }),
  closeAddWithProjectDialog: () => set({ isAddWithProjectDialogOpen: false }),
  openEditDialog: (situation) => set({ editingSituation: situation }),
  closeEditDialog: () => set({ editingSituation: null }),
  setDeletingId: (id) => set({ deletingId: id }),
  openContract: (id) => set({ openContractId: id, openSituationId: null }),
  closeContract: () => set({ openContractId: null, openSituationId: null }),
  openSituation: (id) => set({ openSituationId: id }),
  closeSituation: () => set({ openSituationId: null }),
  openBillingDialog: (contractId) => set({ editingBillingContractId: contractId }),
  closeBillingDialog: () => set({ editingBillingContractId: null }),
}));
