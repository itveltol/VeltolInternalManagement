"use client";

import { VacationTable } from "./VacationTable";
import type { VacationRequest } from "../types";

interface Props {
  requests: VacationRequest[];
  isAdmin: boolean;
  currentUserId: string;
}

export function VacationShell({ requests, isAdmin, currentUserId }: Props) {
  return (
    <VacationTable requests={requests} isAdmin={isAdmin} currentUserId={currentUserId} />
  );
}
