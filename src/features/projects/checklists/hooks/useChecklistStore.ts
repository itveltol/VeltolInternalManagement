import { create } from "zustand";
import type { DailyLogRecord, ChecklistRow } from "@/features/projects/checklists/types";
import type { Document } from "@/features/documents/types";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface RowUIState {
  plan_total: string;
  zile: string;
  todayValue: string;
  status: SaveStatus;
  todayStatus: SaveStatus;
  historyOpen: boolean;
  historyRecords: DailyLogRecord[] | null;
  historyLoading: boolean;
  docsOpen: boolean;
  docsRecords: Document[] | null;
  docsLoading: boolean;
}

interface ChecklistStore {
  rowState: Record<number, RowUIState>;
  dirtySet: Set<number>;
  initRows: (rows: ChecklistRow[]) => void;
  updateField: (itemNumber: number, field: "plan_total" | "zile", value: string) => void;
  markDirty: (itemNumber: number) => void;
  clearDirty: (itemNumber: number) => void;
  setRowStatus: (itemNumber: number, status: SaveStatus) => void;
  updateTodayValue: (itemNumber: number, value: string) => void;
  setTodayStatus: (itemNumber: number, status: SaveStatus) => void;
  toggleHistoryOpen: (itemNumber: number, open: boolean) => void;
  setHistoryLoading: (itemNumber: number, loading: boolean) => void;
  setHistoryRecords: (itemNumber: number, records: DailyLogRecord[]) => void;
  closeAllHistory: () => void;
  toggleDocsOpen: (itemNumber: number, open: boolean) => void;
  setDocsLoading: (itemNumber: number, loading: boolean) => void;
  setDocsRecords: (itemNumber: number, records: Document[]) => void;
}

export const useChecklistStore = create<ChecklistStore>()((set) => ({
  rowState: {},
  dirtySet: new Set(),

  initRows: (rows) => {
    const init: Record<number, RowUIState> = {};
    for (const row of rows) {
      if (!row.isSection) {
        init[row.number] = {
          plan_total: row.plan_total != null ? String(row.plan_total) : "",
          zile: row.zile != null ? String(row.zile) : "",
          todayValue: "",
          status: "idle",
          todayStatus: "idle",
          historyOpen: false,
          historyRecords: null,
          historyLoading: false,
          docsOpen: false,
          docsRecords: null,
          docsLoading: false,
        };
      }
    }
    set({ rowState: init, dirtySet: new Set() });
  },

  updateField: (itemNumber, field, value) =>
    set((s) => ({
      rowState: { ...s.rowState, [itemNumber]: { ...s.rowState[itemNumber], [field]: value } },
    })),

  markDirty: (itemNumber) =>
    set((s) => ({ dirtySet: new Set(s.dirtySet).add(itemNumber) })),

  clearDirty: (itemNumber) =>
    set((s) => {
      const next = new Set(s.dirtySet);
      next.delete(itemNumber);
      return { dirtySet: next };
    }),

  setRowStatus: (itemNumber, status) =>
    set((s) => ({
      rowState: { ...s.rowState, [itemNumber]: { ...s.rowState[itemNumber], status } },
    })),

  updateTodayValue: (itemNumber, value) =>
    set((s) => ({
      rowState: { ...s.rowState, [itemNumber]: { ...s.rowState[itemNumber], todayValue: value } },
    })),

  setTodayStatus: (itemNumber, todayStatus) =>
    set((s) => ({
      rowState: { ...s.rowState, [itemNumber]: { ...s.rowState[itemNumber], todayStatus } },
    })),

  toggleHistoryOpen: (itemNumber, open) =>
    set((s) => ({
      rowState: { ...s.rowState, [itemNumber]: { ...s.rowState[itemNumber], historyOpen: open } },
    })),

  setHistoryLoading: (itemNumber, historyLoading) =>
    set((s) => ({
      rowState: { ...s.rowState, [itemNumber]: { ...s.rowState[itemNumber], historyLoading } },
    })),

  setHistoryRecords: (itemNumber, historyRecords) =>
    set((s) => ({
      rowState: { ...s.rowState, [itemNumber]: { ...s.rowState[itemNumber], historyRecords, historyLoading: false } },
    })),

  closeAllHistory: () =>
    set((s) => {
      const next: Record<number, RowUIState> = {};
      for (const k in s.rowState) {
        next[k] = s.rowState[k].historyOpen
          ? { ...s.rowState[k], historyOpen: false }
          : s.rowState[k];
      }
      return { rowState: next };
    }),

  toggleDocsOpen: (itemNumber, open) =>
    set((s) => ({
      rowState: { ...s.rowState, [itemNumber]: { ...s.rowState[itemNumber], docsOpen: open, docsRecords: open ? s.rowState[itemNumber]?.docsRecords : null } },
    })),

  setDocsLoading: (itemNumber, docsLoading) =>
    set((s) => ({
      rowState: { ...s.rowState, [itemNumber]: { ...s.rowState[itemNumber], docsLoading } },
    })),

  setDocsRecords: (itemNumber, docsRecords) =>
    set((s) => ({
      rowState: { ...s.rowState, [itemNumber]: { ...s.rowState[itemNumber], docsRecords, docsLoading: false } },
    })),
}));
