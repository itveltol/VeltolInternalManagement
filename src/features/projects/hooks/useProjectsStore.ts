import { create } from "zustand";
import type { Project } from "../types";

interface ProjectsStore {
  isAddDialogOpen: boolean;
  editingProject: Project | null;
  deletingId: number | null;
  openAddDialog: () => void;
  closeAddDialog: () => void;
  openEditDialog: (project: Project) => void;
  closeEditDialog: () => void;
  setDeletingId: (id: number | null) => void;
}

export const useProjectsStore = create<ProjectsStore>()((set) => ({
  isAddDialogOpen: false,
  editingProject: null,
  deletingId: null,
  openAddDialog: () => set({ isAddDialogOpen: true }),
  closeAddDialog: () => set({ isAddDialogOpen: false }),
  openEditDialog: (project) => set({ editingProject: project }),
  closeEditDialog: () => set({ editingProject: null }),
  setDeletingId: (id) => set({ deletingId: id }),
}));
