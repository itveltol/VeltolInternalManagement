import { create } from "zustand";
import type { Situation } from "../types";

interface SituationsStore {
  isAddDialogOpen: boolean;
  isAddWithProjectDialogOpen: boolean;
  editingSituation: Situation | null;
  deletingId: number | null;
  /** The contract centralizer row currently drilled into — its project's
   * situations list is level 2 of the centralizer → situations → detail
   * drill-down. Null means we're at the centralizer (level 1). */
  openProjectId: number | null;
  openSituationId: number | null;
  editingBillingProjectId: number | null;
  openAddDialog: () => void;
  closeAddDialog: () => void;
  openAddWithProjectDialog: () => void;
  closeAddWithProjectDialog: () => void;
  openEditDialog: (situation: Situation) => void;
  closeEditDialog: () => void;
  setDeletingId: (id: number | null) => void;
  openProject: (id: number) => void;
  closeProject: () => void;
  openSituation: (id: number) => void;
  closeSituation: () => void;
  openBillingDialog: (projectId: number) => void;
  closeBillingDialog: () => void;
}

export const useSituationsStore = create<SituationsStore>()((set) => ({
  isAddDialogOpen: false,
  isAddWithProjectDialogOpen: false,
  editingSituation: null,
  deletingId: null,
  openProjectId: null,
  openSituationId: null,
  editingBillingProjectId: null,
  openAddDialog: () => set({ isAddDialogOpen: true }),
  closeAddDialog: () => set({ isAddDialogOpen: false }),
  openAddWithProjectDialog: () => set({ isAddWithProjectDialogOpen: true }),
  closeAddWithProjectDialog: () => set({ isAddWithProjectDialogOpen: false }),
  openEditDialog: (situation) => set({ editingSituation: situation }),
  closeEditDialog: () => set({ editingSituation: null }),
  setDeletingId: (id) => set({ deletingId: id }),
  openProject: (id) => set({ openProjectId: id, openSituationId: null }),
  closeProject: () => set({ openProjectId: null, openSituationId: null }),
  openSituation: (id) => set({ openSituationId: id }),
  closeSituation: () => set({ openSituationId: null }),
  openBillingDialog: (projectId) => set({ editingBillingProjectId: projectId }),
  closeBillingDialog: () => set({ editingBillingProjectId: null }),
}));
