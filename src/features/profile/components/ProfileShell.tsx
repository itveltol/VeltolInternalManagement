"use client";

import { ProfileForm } from "./ProfileForm";
import { PasswordForm } from "./PasswordForm";
import { UserTable } from "./UserTable";
import type { Profile } from "../types";

interface Props {
  profile: Profile | null;
  allUsers: Profile[];
  currentUserId: string;
  isAdmin: boolean;
}

export function ProfileShell({ profile, allUsers, currentUserId, isAdmin }: Props) {
  return (
    <>
      <ProfileForm profile={profile} />
      <PasswordForm />
      {isAdmin && <UserTable users={allUsers} currentUserId={currentUserId} />}
    </>
  );
}
