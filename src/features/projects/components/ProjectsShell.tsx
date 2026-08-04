"use client";

import { useState } from "react";
import { ProjectsTable } from "./ProjectsTable";
import type { Project, ProjectManager, ProjectPhase, ProjectCategory, ContractType } from "../types";
import type { ClientRef } from "@/features/clients/types";
import type { SubcontractorRef } from "@/features/subcontractors/types";

interface Props {
  projects: Project[];
  canMutate: boolean;
  managers: ProjectManager[];
  clientRefs: ClientRef[];
  subcontractorRefs: SubcontractorRef[];
  exchangeRate: number | null;
}

export type SortDir = "asc" | "desc" | null;

export function ProjectsShell({ projects, canMutate, managers, clientRefs, subcontractorRefs, exchangeRate }: Props) {
  const [filterPhase, setFilterPhase] = useState<ProjectPhase[]>([]);
  const [filterCategory, setFilterCategory] = useState<ProjectCategory | "">("");
  const [filterContractType, setFilterContractType] = useState<ContractType[]>([]);
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const min = minValue.trim() !== "" ? Number(minValue) : null;
  const max = maxValue.trim() !== "" ? Number(maxValue) : null;

  const filtered = projects.filter((p) => {
    if (filterPhase.length > 0 && !filterPhase.includes(p.current_phase)) return false;
    if (filterCategory && p.project_category !== filterCategory) return false;
    if (
      filterContractType.length > 0 &&
      (p.contract_type.length !== filterContractType.length ||
        !p.contract_type.every((c) => filterContractType.includes(c)))
    ) return false;
    if ((min !== null || max !== null)) {
      if (p.value_eur == null) return false;
      if (min !== null && p.value_eur < min) return false;
      if (max !== null && p.value_eur > max) return false;
    }
    return true;
  });

  if (sortDir) {
    filtered.sort((a, b) => {
      if (a.value_eur == null && b.value_eur == null) return 0;
      if (a.value_eur == null) return 1;
      if (b.value_eur == null) return -1;
      return sortDir === "asc" ? a.value_eur - b.value_eur : b.value_eur - a.value_eur;
    });
  }

  return (
    <ProjectsTable
      projects={filtered}
      canMutate={canMutate}
      managers={managers}
      clientRefs={clientRefs}
      subcontractorRefs={subcontractorRefs}
      exchangeRate={exchangeRate}
      filterPhase={filterPhase}
      onFilterPhase={setFilterPhase}
      filterCategory={filterCategory}
      onFilterCategory={setFilterCategory}
      filterContractType={filterContractType}
      onFilterContractType={setFilterContractType}
      minValue={minValue}
      onMinValue={setMinValue}
      maxValue={maxValue}
      onMaxValue={setMaxValue}
      sortDir={sortDir}
      onSortDir={setSortDir}
    />
  );
}
