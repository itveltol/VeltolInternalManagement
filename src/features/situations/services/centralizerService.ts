import type { Project } from "@/features/projects/types";
import { convertCurrency } from "@/shared/utils/currency";
import type { Situation, ProjectBilling, CentralizerRow, CentralizerMoney } from "../types";

/** Grosses up a net amount for display by a contract's VAT rate. vat_rate = 0
 * (reverse charge / export) leaves the amount unchanged. Every money value
 * already stored in this schema (projects.value_*, situations snapshots,
 * project_billing) is net; this is the one place VAT is applied — never
 * scatter `× 1.21` through components. */
export function grossOf(net: number, vatRate: number): number {
  return net * (1 + vatRate / 100);
}

function money(net: number, vatRate: number): CentralizerMoney {
  return { net, gross: grossOf(net, vatRate) };
}

/**
 * Builds one Situații → Centralizator contracte row per visible project,
 * joining that project's finalized situations (Σ = Valoare executată — draft
 * situations are excluded, matching the frozen-at-finalize audit rule) and
 * its manual billing figures (Facturat/Încasat; a project with no
 * project_billing row yet is treated as 0/0). Every project the caller can
 * see gets a row, including ones with zero situations and zero billing.
 *
 * "Rămas de facturat" is intentionally contract-based
 * (contract − facturat), NOT executat − facturat, and none of the three
 * "rămas"/"de încasat" columns are clamped at zero: a negative value means
 * over-execution or over-invoicing against the contract, which is real
 * information the centralizer should surface, not hide. This differs on
 * purpose from computeSituationFigures, which does clamp incremental pct
 * at 0 for a single situation's billing pct.
 */
export function buildCentralizerRows(
  projects: Project[],
  finalizedSituations: Situation[],
  billing: ProjectBilling[],
): CentralizerRow[] {
  const situationsByProject = new Map<number, Situation[]>();
  for (const situation of finalizedSituations) {
    if (situation.status !== "final") continue;
    const list = situationsByProject.get(situation.project_id) ?? [];
    list.push(situation);
    situationsByProject.set(situation.project_id, list);
  }

  const billingByProject = new Map(billing.map((b) => [b.project_id, b]));

  return projects.map((project) => {
    const situations = situationsByProject.get(project.id) ?? [];
    const executedEurNet = situations.reduce((sum, s) => sum + (s.amount_eur_snapshot ?? 0), 0);
    const executedLeiNet = situations.reduce((sum, s) => sum + (s.amount_lei_snapshot ?? 0), 0);

    const projectBilling = billingByProject.get(project.id) ?? null;
    const invoicedNetSource = projectBilling?.invoiced_net ?? 0;
    const collectedNetSource = projectBilling?.collected_net ?? 0;
    const billingCurrency = projectBilling?.currency ?? "EUR";
    const billingRate = projectBilling?.conversion_rate ?? null;

    const invoicedEurNet =
      billingCurrency === "EUR" ? invoicedNetSource : convertCurrency(invoicedNetSource, "RON", "EUR", billingRate) ?? 0;
    const invoicedLeiNet =
      billingCurrency === "RON" ? invoicedNetSource : convertCurrency(invoicedNetSource, "EUR", "RON", billingRate) ?? 0;
    const collectedEurNet =
      billingCurrency === "EUR" ? collectedNetSource : convertCurrency(collectedNetSource, "RON", "EUR", billingRate) ?? 0;
    const collectedLeiNet =
      billingCurrency === "RON" ? collectedNetSource : convertCurrency(collectedNetSource, "EUR", "RON", billingRate) ?? 0;

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
