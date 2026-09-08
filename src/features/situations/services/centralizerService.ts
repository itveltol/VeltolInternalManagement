import { convertCurrency, grossOf } from "@/shared/utils/currency";
import type { Situation, CentralizerRow, CentralizerMoney, SituationContractRef } from "../types";

function money(net: number, vatRate: number): CentralizerMoney {
  return { net, gross: grossOf(net, vatRate) };
}

/**
 * Builds one Situații → Centralizator contracte row per visible CONTRACT
 * (a project can now have several — e.g. a proiectare+executie contract and
 * a separate racordare contract both on one site — see the contracts table,
 * supabase/migrations/20260908000127_create_contracts.sql), joining that
 * contract's final-or-paid situations. Draft situations are excluded
 * entirely, matching the frozen-at-finalize audit rule. Every contract the
 * caller can see gets a row, including ones with zero situations.
 *
 * Contract value, Executat, Facturat, and Încasat are all shown
 * VAT-inclusive (gross) for a single consistent convention across the
 * centralizer — none of them is a silent exception.
 *
 * Executat, Facturat, and Încasat are three different kinds of figure, not
 * three views of the same underlying sum. Executat is a LIVE progress fact:
 * (progress_pct / 100) × contract value — progress_pct here comes from
 * contract.progress_pct, computed by filtering the project's ONE Matrice
 * (unchanged, one matrix per project) down to this specific contract's own
 * contract_type[] (see contract_progress_pct() in supabase/migrations/
 * 20260908000128_situations_contract_id.sql), not a second matrix and not
 * the project's blended progress_pct. It moves the moment a checklist item
 * within this contract's phases changes, independent of whether any
 * situație has ever been created for the contract. Facturat and Încasat, by
 * contrast, are situație-EVENT facts: Facturat sums every final-or-paid
 * situație's frozen snapshot (cumulative, monotonically non-decreasing
 * "invoiced to date" — a situație being marked paid doesn't un-invoice it,
 * the same way a real ERP's AR module never shrinks invoiced-to-date when a
 * payment comes in), and Încasat sums only the `paid` subset. Because
 * Executat now tracks live progress while Facturat only moves when a
 * situație is actually finalized, the two can legitimately diverge in
 * either direction — progress can run ahead of the paperwork, or a
 * finalized situație can sit exactly at whatever progress was at finalize
 * time while later progress keeps moving. That divergence is real
 * information, not a bug.
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
  contracts: SituationContractRef[],
  billableSituations: Situation[],
): CentralizerRow[] {
  const situationsByContract = new Map<number, Situation[]>();
  for (const situation of billableSituations) {
    if (situation.status !== "final" && situation.status !== "paid") continue;
    const list = situationsByContract.get(situation.contract_id) ?? [];
    list.push(situation);
    situationsByContract.set(situation.contract_id, list);
  }

  return contracts.map((contract) => {
    const situations = situationsByContract.get(contract.id) ?? [];
    const isResidential = contract.project.project_category === "residential";

    const contractSourceNet = contract.currency === "EUR" ? contract.value_eur ?? 0 : contract.value_lei ?? 0;
    const executedSourceNet = (contract.progress_pct / 100) * contractSourceNet;
    const executedOtherNet = convertCurrency(
      executedSourceNet,
      contract.currency,
      contract.currency === "EUR" ? "RON" : "EUR",
      contract.conversion_rate,
    ) ?? 0;
    const executedEurNet = contract.currency === "EUR" ? executedSourceNet : executedOtherNet;
    const executedLeiNet = contract.currency === "RON" ? executedSourceNet : executedOtherNet;

    const invoicedEurNet = situations.reduce((sum, s) => sum + (s.amount_eur_snapshot ?? 0), 0);
    const invoicedLeiNet = situations.reduce((sum, s) => sum + (s.amount_lei_snapshot ?? 0), 0);

    const paidSituations = situations.filter((s) => s.status === "paid");
    const collectedEurNet = paidSituations.reduce((sum, s) => sum + (s.amount_eur_snapshot ?? 0), 0);
    const collectedLeiNet = paidSituations.reduce((sum, s) => sum + (s.amount_lei_snapshot ?? 0), 0);

    const contractEurNet = contract.currency === "EUR"
      ? contract.value_eur ?? 0
      : convertCurrency(contract.value_lei, "RON", "EUR", contract.conversion_rate) ?? 0;
    const contractLeiNet = contract.currency === "RON"
      ? contract.value_lei ?? 0
      : convertCurrency(contract.value_eur, "EUR", "RON", contract.conversion_rate) ?? 0;
    const vatRate = contract.vat_rate;

    const contractValueEur = money(contractEurNet, vatRate);
    const executedEur = isResidential ? null : money(executedEurNet, vatRate);
    const invoicedEur = money(invoicedEurNet, vatRate);
    const collectedEur = money(collectedEurNet, vatRate);

    const contractValueLei = money(contractLeiNet, vatRate);
    const executedLei = isResidential ? null : money(executedLeiNet, vatRate);
    const invoicedLei = money(invoicedLeiNet, vatRate);
    const collectedLei = money(collectedLeiNet, vatRate);

    return {
      contractId: contract.id,
      projectId: contract.project.id,
      projectCategory: contract.project.project_category,
      contractNumber: contract.contract_number,
      contractDate: contract.contract_date,
      contractTypes: contract.contract_type,
      projectName: contract.project.name,
      beneficiar: contract.project.client?.name ?? null,
      currentPhase: contract.project.current_phase,
      vatRate,
      eur: {
        contractValue: contractValueEur,
        executed: executedEur,
        invoiced: invoicedEur,
        collected: collectedEur,
        remainingToExecute: executedEur ? contractValueEur.gross - executedEur.gross : null,
        remainingToInvoice: contractValueEur.gross - invoicedEur.gross,
        remainingToCollect: invoicedEur.gross - collectedEur.gross,
      },
      lei: {
        contractValue: contractValueLei,
        executed: executedLei,
        invoiced: invoicedLei,
        collected: collectedLei,
        remainingToExecute: executedLei ? contractValueLei.gross - executedLei.gross : null,
        remainingToInvoice: contractValueLei.gross - invoicedLei.gross,
        remainingToCollect: invoicedLei.gross - collectedLei.gross,
      },
    };
  });
}
