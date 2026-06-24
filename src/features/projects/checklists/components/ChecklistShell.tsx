"use client";

import { ChecklistTable } from "./ChecklistTable";
import type { ChecklistRow } from "@/features/projects/checklists/types";

interface Props {
  rows: ChecklistRow[];
  projectId: number;
  canMutate: boolean;
}

export function ChecklistShell({ rows, projectId, canMutate }: Props) {
  return <ChecklistTable rows={rows} projectId={projectId} canMutate={canMutate} />;
}
