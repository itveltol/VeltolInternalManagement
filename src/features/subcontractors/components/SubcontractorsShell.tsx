"use client";

import { SubcontractorsTable } from "./SubcontractorsTable";
import type { SubcontractorWithProjects } from "../types";

interface Props {
  subcontractors: SubcontractorWithProjects[];
  canMutate: boolean;
}

export function SubcontractorsShell({ subcontractors, canMutate }: Props) {
  return <SubcontractorsTable subcontractors={subcontractors} canMutate={canMutate} />;
}
