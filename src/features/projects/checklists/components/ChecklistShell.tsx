"use client";

import { ChecklistTable } from "./ChecklistTable";
import type { ChecklistRow } from "@/features/projects/checklists/types";

interface Props {
  rows: ChecklistRow[];
  projectId: number;
  canMutate: boolean;
  teamMemberCount: number | null;
}

export function ChecklistShell({ rows, projectId, canMutate, teamMemberCount }: Props) {
  return <ChecklistTable rows={rows} projectId={projectId} canMutate={canMutate} teamMemberCount={teamMemberCount} />;
}
