"use client";

import type { ReactNode } from "react";
import { useSituationsStore } from "../hooks/useSituationsStore";
import { ContractCentralizerTable } from "./ContractCentralizerTable";
import { SituationsTable } from "./SituationsTable";
import { SituationDetail } from "./SituationDetail";
import { EditContractBillingDialog } from "./EditContractBillingDialog";
import type { CentralizerRow, SituationWithProject } from "../types";
import type { Project, ProjectManager } from "@/features/projects/types";
import type { ClientRef } from "@/features/clients/types";

interface Props {
  rows: CentralizerRow[];
  situations: SituationWithProject[];
  projects: Project[];
  managers: ProjectManager[];
  clientRefs: ClientRef[];
  nextContractNumber: string;
  canMutate: boolean;
  canMutateBilling: boolean;
}

/**
 * Three-level drill-down: contract centralizer (level 1, the default view of
 * /situations) → one contract's situations (level 2) → a single situation's
 * detail (level 3). Levels are addressed by two independent store slots
 * (openProjectId, openSituationId) rather than a single stack, since level 3
 * always returns to level 2, not level 1.
 */
export function SituationsShell({
  rows,
  situations,
  projects,
  managers,
  clientRefs,
  nextContractNumber,
  canMutate,
  canMutateBilling,
}: Props) {
  const { openProjectId, openSituationId, closeSituation, closeProject, editingBillingProjectId, closeBillingDialog } = useSituationsStore();

  const openSituation = situations.find((s) => s.id === openSituationId) ?? null;
  const openProject = projects.find((p) => p.id === openProjectId) ?? null;
  const billingProject = projects.find((p) => p.id === editingBillingProjectId) ?? null;

  let content: ReactNode;
  if (openSituation) {
    content = (
      <SituationDetail
        situation={openSituation}
        situations={situations}
        canMutate={canMutate}
        canMutateBilling={canMutateBilling}
        onBack={closeSituation}
      />
    );
  } else if (openProject) {
    content = (
      <SituationsTable
        situations={situations}
        projects={projects}
        canMutate={canMutate}
        canMutateBilling={canMutateBilling}
        projectFilter={openProject}
        onBack={closeProject}
      />
    );
  } else {
    content = (
      <ContractCentralizerTable
        rows={rows}
        managers={managers}
        clientRefs={clientRefs}
        nextContractNumber={nextContractNumber}
        canMutate={canMutate}
        canMutateBilling={canMutateBilling}
      />
    );
  }

  return (
    <>
      {content}
      {billingProject && (
        <EditContractBillingDialog
          project={billingProject}
          clientRefs={clientRefs}
          open={!!billingProject}
          onClose={closeBillingDialog}
        />
      )}
    </>
  );
}
