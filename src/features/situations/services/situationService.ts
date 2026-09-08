import type { SituationsApiClient, CreateSituationPayload, UpdateSituationPayload, FinalizeSituationPayload } from "../api/types";
import type { Situation, SituationWithProject, SituationFigures, Currency } from "../types";
import { convertCurrency } from "@/shared/utils/currency";

export function getAllSituationsWithProjects(api: SituationsApiClient): Promise<SituationWithProject[]> {
  return api.getAllSituationsWithProjects();
}

export function getSituationsForContract(api: SituationsApiClient, contractId: number): Promise<Situation[]> {
  return api.getSituationsForContract(contractId);
}

export function getAllBillableSituations(api: SituationsApiClient): Promise<Situation[]> {
  return api.getAllBillableSituations();
}

export function createSituation(api: SituationsApiClient, payload: CreateSituationPayload) {
  return api.createSituation(payload);
}

export function updateSituation(api: SituationsApiClient, situationId: number, payload: UpdateSituationPayload) {
  return api.updateSituation(situationId, payload);
}

export function deleteSituation(api: SituationsApiClient, situationId: number) {
  return api.deleteSituation(situationId);
}

export function finalizeSituation(api: SituationsApiClient, situationId: number, payload: FinalizeSituationPayload) {
  return api.finalizeSituation(situationId, payload);
}

export function markSituationPaid(api: SituationsApiClient, situationId: number, paidAt: string) {
  return api.markSituationPaid(situationId, paidAt);
}

/** Most recently finalized-or-paid situation for a contract, excluding the
 * given one — the baseline a new situation bills against. A paid situation
 * was finalized first and keeps its original finalized_at, so it still sorts
 * correctly alongside merely-final ones. */
export function findPreviousFinalized(
  situations: Situation[],
  excludeId: number,
): Situation | null {
  const finalized = situations
    .filter((s) => (s.status === "final" || s.status === "paid") && s.id !== excludeId && s.finalized_at != null)
    .sort((a, b) => new Date(b.finalized_at!).getTime() - new Date(a.finalized_at!).getTime());
  return finalized[0] ?? null;
}

/**
 * The figures shown for a situation: frozen snapshot once finalized, or
 * live-computed while draft. pct is the INCREMENTAL Matrice progress since
 * the previous finalized situation for the same contract (previousPct), not
 * the contract's raw cumulative completion — each situation bills only the
 * work done since the last one, like a real payment certificate. Clamped at
 * 0 in case progress ever regresses between two finalizations.
 *
 * contract.progress_pct is the same project-Matrice-filtered-by-contract-type
 * figure the centralizer's Executat uses (see contract_progress_pct() /
 * buildCentralizerRows) — not the project's blended progress_pct.
 *
 * A contract only ever has one real source-currency value (value_eur/
 * value_lei — see currency/conversion_rate migration); the other is derived
 * here via the contract's own conversion_rate, not computed independently,
 * so it isn't silently null for contracts entered in RON.
 */
export function computeSituationFigures(
  situation: Pick<Situation, "status" | "pct_snapshot" | "amount_eur_snapshot" | "amount_lei_snapshot">,
  contract: { progress_pct: number; value_eur: number | null; value_lei: number | null; currency: Currency; conversion_rate: number | null },
  previousPct: number,
): SituationFigures {
  if (situation.status === "final" || situation.status === "paid") {
    return {
      pct: situation.pct_snapshot,
      amountEur: situation.amount_eur_snapshot,
      amountLei: situation.amount_lei_snapshot,
    };
  }

  const pct = Math.max(0, contract.progress_pct - previousPct);
  const sourceValue = contract.currency === "EUR" ? contract.value_eur : contract.value_lei;
  const billedSource = sourceValue != null ? (pct / 100) * sourceValue : null;
  const billedOther = convertCurrency(
    billedSource,
    contract.currency,
    contract.currency === "EUR" ? "RON" : "EUR",
    contract.conversion_rate,
  );

  return {
    pct,
    amountEur: contract.currency === "EUR" ? billedSource : billedOther,
    amountLei: contract.currency === "RON" ? billedSource : billedOther,
  };
}
