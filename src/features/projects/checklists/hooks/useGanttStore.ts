import { create } from "zustand";
import type { ChecklistRow } from "@/features/projects/checklists/types";

interface GanttStore {
  isAddTaskDialogOpen: boolean;
  editingRow: ChecklistRow | null;
  openAddTaskDialog: () => void;
  closeAddTaskDialog: () => void;
  openScheduleDialog: (row: ChecklistRow) => void;
  closeScheduleDialog: () => void;
}

export const useGanttStore = create<GanttStore>()((set) => ({
  isAddTaskDialogOpen: false,
  editingRow: null,
  openAddTaskDialog: () => set({ isAddTaskDialogOpen: true }),
  closeAddTaskDialog: () => set({ isAddTaskDialogOpen: false }),
  openScheduleDialog: (row) => set({ editingRow: row }),
  closeScheduleDialog: () => set({ editingRow: null }),
}));
