import type { Project } from "@/features/projects/types";
import { convertCurrency, grossOf } from "@/shared/utils/currency";
import type { Situation, CentralizerRow, CentralizerMoney } from "../types";

function money(net: number, vatRate: number): CentralizerMoney {
  return { net, gross: grossOf(net, vatRate) };
}

/**
 * Builds one Situații → Centralizator contracte row per visible project,
 * joining that project's final-or-paid situations. Draft situations are
 * excluded entirely, matching the frozen-at-finalize audit rule. Every
 * project the caller can see gets a row, including ones with zero situations.
 *
 * Contract value, Executat, Facturat, and Încasat are all shown
 * VAT-inclusive (gross) for a single consistent convention across the
 * centralizer — none of them is a silent exception.
 *
 * Executat, Facturat, and Încasat are three different kinds of figure, not
 * three views of the same underlying sum. Executat is a LIVE progress fact:
 * (progress_pct / 100) × contract value, tracking Matrice checklist
 * completion continuously — it moves the moment a checklist item changes,
 * independent of whether any situație has ever been created for the
 * project. Facturat and Încasat, by contrast, are situație-EVENT facts:
 * Facturat sums every final-or-paid situație's frozen snapshot (cumulative,
 * monotonically non-decreasing "invoiced to date" — a situație being marked
 * paid doesn't un-invoice it, the same way a real ERP's AR module never
 * shrinks invoiced-to-date when a payment comes in), and Încasat sums only
 * the `paid` subset. Because Executat now tracks live progress while
 * Facturat only moves when a situație is actually finalized, the two can
 * legitimately diverge in either direction — progress can run ahead of the
 * paperwork, or a finalized situație can sit exactly at whatever progress
 * was at finalize time while later progress keeps moving. That divergence
 * is real information, not a bug.
 *
 * "Rămas de facturat" is contract − facturat (shrinks only when a *new*
 * situație is finalized, never when an existing one is paid). "Rămas de
 * încasat" is facturat − încasat — the outstanding-AR balance ("invoiced
 * but not yet paid"). None of the three "rămas"/"de încasat" figures are
 * clamped at zero: a negative value means over-execution or
 * over-invoicing against the contract, which is real information the
 * centralizer should surface, not hide. This differs on purpose from
 * computeSituationFigures, which does clamp incremental pct at 0 for a
 * single situation's billing pct.
 */
export function buildCentralizerRows(
  projects: Project[],
  billableSituations: Situation[],
): CentralizerRow[] {
  const situationsByProject = new Map<number, Situation[]>();
  for (const situation of billableSituations) {
    if (situation.status !== "final" && situation.status !== "paid") continue;
    const list = situationsByProject.get(situation.project_id) ?? [];
    list.push(situation);
    situationsByProject.set(situation.project_id, list);
  }

  return projects.map((project) => {
    const situations = situationsByProject.get(project.id) ?? [];

    const contractSourceNet = project.currency === "EUR" ? project.value_eur ?? 0 : project.value_lei ?? 0;
    const executedSourceNet = (project.progress_pct / 100) * contractSourceNet;
    const executedOtherNet = convertCurrency(
      executedSourceNet,
      project.currency,
      project.currency === "EUR" ? "RON" : "EUR",
      project.conversion_rate,
    ) ?? 0;
    const executedEurNet = project.currency === "EUR" ? executedSourceNet : executedOtherNet;
    const executedLeiNet = project.currency === "RON" ? executedSourceNet : executedOtherNet;

    const invoicedEurNet = situations.reduce((sum, s) => sum + (s.amount_eur_snapshot ?? 0), 0);
    const invoicedLeiNet = situations.reduce((sum, s) => sum + (s.amount_lei_snapshot ?? 0), 0);

    const paidSituations = situations.filter((s) => s.status === "paid");
    const collectedEurNet = paidSituations.reduce((sum, s) => sum + (s.amount_eur_snapshot ?? 0), 0);
    const collectedLeiNet = paidSituations.reduce((sum, s) => sum + (s.amount_lei_snapshot ?? 0), 0);

    const contractEurNet = project.value_eur ?? 0;
    const contractLeiNet = project.value_lei ?? 0;
    const vatRate = project.vat_rate;

    const contractValueEur = money(contractEurNet, vatRate);
    const executedEur = money(executedEurNet, vatRate);
    const invoicedEur = money(invoicedEurNet, vatRate);
    const collectedEur = money(collectedEurNet, vatRate);

    const contractValueLei = money(contractLeiNet, vatRate);
    const executedLei = money(executedLeiNet, vatRate);
    const invoicedLei = money(invoicedLeiNet, vatRate);
    const collectedLei = money(collectedLeiNet, vatRate);

    return {
      projectId: project.id,
      contractNumber: project.contract_number,
      contractDate: project.contract_date,
      projectName: project.name,
      beneficiar: project.client?.name ?? null,
      currentPhase: project.current_phase,
      vatRate,
      eur: {
        contractValue: contractValueEur,
        executed: executedEur,
        invoiced: invoicedEur,
        collected: collectedEur,
        remainingToExecute: contractValueEur.gross - executedEur.gross,
        remainingToInvoice: contractValueEur.gross - invoicedEur.gross,
        remainingToCollect: invoicedEur.gross - collectedEur.gross,
      },
      lei: {
        contractValue: contractValueLei,
        executed: executedLei,
        invoiced: invoicedLei,
        collected: collectedLei,
        remainingToExecute: contractValueLei.gross - executedLei.gross,
        remainingToInvoice: contractValueLei.gross - invoicedLei.gross,
        remainingToCollect: invoicedLei.gross - collectedLei.gross,
      },
    };
  });
}
