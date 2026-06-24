import type { ProfileApiClient, UpdateProfilePayload, UpdateUserPayload, InviteUserPayload } from "../api/types";
import type { Profile, AppRole } from "../types";

export async function getProfile(client: ProfileApiClient, userId: string): Promise<Profile | null> {
  return client.getProfile(userId);
}

export async function getAllUsers(client: ProfileApiClient): Promise<Profile[]> {
  return client.getAllUsers();
}

export async function updateProfile(
  client: ProfileApiClient,
  userId: string,
  payload: UpdateProfilePayload
): Promise<void> {
  return client.updateProfile(userId, payload);
}

export async function changePassword(
  client: ProfileApiClient,
  newPassword: string,
  confirmPassword: string
): Promise<void> {
  if (newPassword !== confirmPassword) throw new Error("passwordMismatch");
  if (newPassword.length < 8) throw new Error("passwordTooShort");
  return client.changePassword(newPassword);
}

export async function inviteUser(
  client: ProfileApiClient,
  payload: InviteUserPayload
): Promise<void> {
  const { userId } = await client.inviteUser(payload);
  await client.upsertProfileRow(userId, payload.email, payload.role);
}

export async function updateUser(
  client: ProfileApiClient,
  userId: string,
  payload: UpdateUserPayload
): Promise<void> {
  return client.updateProfile(userId, payload);
}

export async function deleteUser(
  client: ProfileApiClient,
  userId: string
): Promise<void> {
  return client.deleteUser(userId);
}
