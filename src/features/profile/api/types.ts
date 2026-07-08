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
  medical_exam_expires_at: string | null;
}

export interface InviteUserPayload {
  email: string;
  role: AppRole;
}

export interface CompleteRegistrationPayload {
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
}

export interface ProfileApiClient {
  getProfile(userId: string): Promise<Profile | null>;
  getAllUsers(): Promise<Profile[]>;
  updateProfile(userId: string, payload: UpdateProfilePayload): Promise<void>;
  changePassword(newPassword: string): Promise<void>;
  inviteUser(payload: InviteUserPayload): Promise<{ userId: string; tempPassword: string }>;
  upsertProfileRow(userId: string, email: string, role: AppRole): Promise<void>;
  completeRegistration(payload: CompleteRegistrationPayload): Promise<void>;
  deleteUser(userId: string): Promise<void>;
}
