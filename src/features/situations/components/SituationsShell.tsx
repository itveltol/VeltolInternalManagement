"use client";

import { useSituationsStore } from "../hooks/useSituationsStore";
import { SituationsTable } from "./SituationsTable";
import { SituationDetail } from "./SituationDetail";
import type { SituationWithProject } from "../types";
import type { Project } from "@/features/projects/types";

interface Props {
  situations: SituationWithProject[];
  projects: Project[];
  canMutate: boolean;
}

export function SituationsShell({ situations, projects, canMutate }: Props) {
  const { openSituationId, closeSituation } = useSituationsStore();
  const openSituation = situations.find((s) => s.id === openSituationId) ?? null;

  if (openSituation) {
    return (
      <SituationDetail
        situation={openSituation}
        situations={situations}
        canMutate={canMutate}
        onBack={closeSituation}
      />
    );
  }

  return (
    <SituationsTable situations={situations} projects={projects} canMutate={canMutate} />
  );
}
