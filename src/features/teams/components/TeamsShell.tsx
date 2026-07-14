"use client";

import { TeamsTable } from "./TeamsTable";
import type { Team } from "../types";
import type { ProfileRef } from "./TeamMemberPicker";

interface Props {
  teams: Team[];
  canMutate: boolean;
  allProfiles: ProfileRef[];
}

export function TeamsShell({ teams, canMutate, allProfiles }: Props) {
  return <TeamsTable teams={teams} canMutate={canMutate} allProfiles={allProfiles} />;
}
