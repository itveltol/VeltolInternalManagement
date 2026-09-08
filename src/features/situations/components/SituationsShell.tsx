"use client";

import { useEffect, type ReactNode } from "react";
import { useSituationsStore } from "../hooks/useSituationsStore";
import { ContractCentralizerTable } from "./ContractCentralizerTable";
import { SituationsTable } from "./SituationsTable";
import { SituationDetail } from "./SituationDetail";
import { EditContractBillingDialog } from "./EditContractBillingDialog";
import type { CentralizerRow, SituationWithProject, SituationContractRef } from "../types";
import type { Project, ProjectManager } from "@/features/projects/types";
import type { ClientRef } from "@/features/clients/types";

interface Props {
  rows: CentralizerRow[];
  contracts: SituationContractRef[];
  situations: SituationWithProject[];
  projects: Project[];
  managers: ProjectManager[];
  clientRefs: ClientRef[];
  nextContractNumber: string;
  canMutate: boolean;
  canMutateBilling: boolean;
  /** Deep-links straight into a specific contract's situations list (level
   * 2) — e.g. from the project detail page's "go to situations" button,
   * via /situations?contract={id}. Null/absent starts at the centralizer
   * (level 1), same as before. */
  initialContractId?: number | null;
}

/**
 * Three-level drill-down: contract centralizer (level 1, the default view of
 * /situations) → one contract's situations (level 2) → a single situation's
 * detail (level 3). Levels are addressed by two independent store slots
 * (openContractId, openSituationId) rather than a single stack, since level 3
 * always returns to level 2, not level 1. A project can now have several
 * contracts, so level 2 is scoped to one CONTRACT (via CentralizerRow),
 * not the whole project.
 */
export function SituationsShell({
  rows,
  contracts,
  situations,
  projects,
  managers,
  clientRefs,
  nextContractNumber,
  canMutate,
  canMutateBilling,
  initialContractId = null,
}: Props) {
  const { openContractId, openSituationId, closeSituation, closeContract, editingBillingContractId, closeBillingDialog, openContract: openContractInStore } = useSituationsStore();

  // Seed the drill-down from a deep link (?contract=) exactly once on mount
  // — a plain client-side navigation to the same URL later (e.g. clicking
  // "back to centralizer") must not keep re-opening this contract.
  useEffect(() => {
    if (initialContractId != null) openContractInStore(initialContractId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openSituation = situations.find((s) => s.id === openSituationId) ?? null;
  const openContract = contracts.find((c) => c.id === openContractId) ?? null;
  const billingContract = contracts.find((c) => c.id === editingBillingContractId) ?? null;

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
  } else if (openContract) {
    content = (
      <SituationsTable
        situations={situations}
        projects={projects}
        canMutate={canMutate}
        canMutateBilling={canMutateBilling}
        contractFilter={openContract}
        onBack={closeContract}
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
      {billingContract && (
        <EditContractBillingDialog
          contract={billingContract}
          clientRefs={clientRefs}
          open={!!billingContract}
          onClose={closeBillingDialog}
        />
      )}
    </>
  );
}
