import { create } from "zustand";
import type { Profile } from "../types";

interface ProfileStore {
  editingUser: Profile | null;
  isInviteDialogOpen: boolean;
  deletingId: string | null;
  openEditUser: (user: Profile) => void;
  closeEditUser: () => void;
  openInviteDialog: () => void;
  closeInviteDialog: () => void;
  setDeletingId: (id: string | null) => void;
}

export const useProfileStore = create<ProfileStore>()((set) => ({
  editingUser: null,
  isInviteDialogOpen: false,
  deletingId: null,
  openEditUser: (user) => set({ editingUser: user }),
  closeEditUser: () => set({ editingUser: null }),
  openInviteDialog: () => set({ isInviteDialogOpen: true }),
  closeInviteDialog: () => set({ isInviteDialogOpen: false }),
  setDeletingId: (id) => set({ deletingId: id }),
}));
