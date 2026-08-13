"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ProjectsTable } from "./ProjectsTable";
import { getProjectsPage } from "@/app/[locale]/(app)/projects/actions";
import type { Project, ProjectManager, ProjectPhase, ProjectCategory, ContractType } from "../types";
import type { ClientRef } from "@/features/clients/types";
import type { SubcontractorRef } from "@/features/subcontractors/types";

interface Props {
  initialProjects: Project[];
  initialTotalCount: number;
  canMutate: boolean;
  managers: ProjectManager[];
  clientRefs: ClientRef[];
  subcontractorRefs: SubcontractorRef[];
  exchangeRate: number | null;
}

export type SortDir = "asc" | "desc" | null;

export function ProjectsShell({
  initialProjects,
  initialTotalCount,
  canMutate,
  managers,
  clientRefs,
  subcontractorRefs,
  exchangeRate,
}: Props) {
  const [projects, setProjects] = useState(initialProjects);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [page, setPage] = useState(1);
  const [filterPhase, setFilterPhase] = useState<ProjectPhase[]>([]);
  const [filterCategory, setFilterCategory] = useState<ProjectCategory | "">("");
  const [filterContractType, setFilterContractType] = useState<ContractType[]>([]);
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [isFetching, startTransition] = useTransition();

  const fetchProjects = useCallback(() => {
    const min = minValue.trim() !== "" ? Number(minValue) : null;
    const max = maxValue.trim() !== "" ? Number(maxValue) : null;
    startTransition(async () => {
      const result = await getProjectsPage({
        page,
        filters: {
          phase: filterPhase,
          category: filterCategory || null,
          contractType: filterContractType,
          minValue: min,
          maxValue: max,
        },
        sortByValue: sortDir,
      });
      setProjects(result.projects);
      setTotalCount(result.totalCount);
    });
  }, [page, filterPhase, filterCategory, filterContractType, minValue, maxValue, sortDir]);

  // Skip the fetch that would otherwise fire on first render — the server
  // already gave us page 1 with no filters via initialProjects/initialTotalCount.
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterPhase, filterCategory, filterContractType, minValue, maxValue, sortDir]);

  // Any filter/sort change should jump back to page 1 — wrap each setter so
  // the reset happens as part of the same state update, not derived in render.
  function resettingPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }
  const handleFilterPhase = resettingPage(setFilterPhase);
  const handleFilterCategory = resettingPage(setFilterCategory);
  const handleFilterContractType = resettingPage(setFilterContractType);
  const handleMinValue = resettingPage(setMinValue);
  const handleMaxValue = resettingPage(setMaxValue);
  const handleSortDir = resettingPage(setSortDir);

  return (
    <ProjectsTable
      projects={projects}
      totalCount={totalCount}
      page={page}
      onPageChange={setPage}
      onRefetch={fetchProjects}
      isFetching={isFetching}
      canMutate={canMutate}
      managers={managers}
      clientRefs={clientRefs}
      subcontractorRefs={subcontractorRefs}
      exchangeRate={exchangeRate}
      filterPhase={filterPhase}
      onFilterPhase={handleFilterPhase}
      filterCategory={filterCategory}
      onFilterCategory={handleFilterCategory}
      filterContractType={filterContractType}
      onFilterContractType={handleFilterContractType}
      minValue={minValue}
      onMinValue={handleMinValue}
      maxValue={maxValue}
      onMaxValue={handleMaxValue}
      sortDir={sortDir}
      onSortDir={handleSortDir}
    />
  );
}
