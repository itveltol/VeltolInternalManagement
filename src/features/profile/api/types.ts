import type { Profile, AppRole } from "../types";

export interface UpdateProfilePayload {
  first_name: string;
  last_name: string;
  phone: string;
}

export interface UpdateUserPayload {
  first_name: string;
  last_name: string;
  phone: string;
  role: AppRole;
}

export interface InviteUserPayload {
  email: string;
  role: AppRole;
  redirectTo: string;
}

export interface ProfileApiClient {
  getProfile(userId: string): Promise<Profile | null>;
  getAllUsers(): Promise<Profile[]>;
  updateProfile(userId: string, payload: UpdateProfilePayload): Promise<void>;
  changePassword(newPassword: string): Promise<void>;
  inviteUser(payload: InviteUserPayload): Promise<{ userId: string }>;
  upsertProfileRow(userId: string, email: string, role: AppRole): Promise<void>;
  deleteUser(userId: string): Promise<void>;
}
