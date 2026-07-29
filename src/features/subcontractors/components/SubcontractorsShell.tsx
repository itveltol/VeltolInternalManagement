"use client";

import { SubcontractorsTable } from "./SubcontractorsTable";
import type { Subcontractor } from "../types";

interface Props {
  subcontractors: Subcontractor[];
  canMutate: boolean;
}

export function SubcontractorsShell({ subcontractors, canMutate }: Props) {
  return <SubcontractorsTable subcontractors={subcontractors} canMutate={canMutate} />;
}
