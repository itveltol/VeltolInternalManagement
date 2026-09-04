"use client";

import { useTranslations } from "next-intl";
import { ProfileForm } from "./ProfileForm";
import { PasswordForm } from "./PasswordForm";
import { UserTable } from "./UserTable";
import { OutfieldWorkersTable } from "./OutfieldWorkersTable";
import { VacationBalanceCard } from "@/features/vacation/components/VacationBalanceCard";
import type { Profile } from "../types";
import type { VacationBalance } from "@/features/vacation/types";
import type { OutfieldWorkerRow } from "@/app/[locale]/(app)/profile/actions";

interface Props {
  profile: Profile | null;
  allUsers: Profile[];
  outfieldWorkers: OutfieldWorkerRow[];
  workerTeams: { id: number; name: string }[];
  currentUserId: string;
  isAdmin: boolean;
  balance: VacationBalance | null;
}

export function ProfileShell({ profile, allUsers, outfieldWorkers, workerTeams, currentUserId, isAdmin, balance }: Props) {
  const t = useTranslations("vacationBalance");
  return (
    <>
      <ProfileForm profile={profile} />
      <VacationBalanceCard balance={balance} label={t("title")} />
      <PasswordForm />
      {isAdmin && <UserTable users={allUsers} currentUserId={currentUserId} />}
      {isAdmin && <OutfieldWorkersTable workers={outfieldWorkers} teams={workerTeams} />}
    </>
  );
}
