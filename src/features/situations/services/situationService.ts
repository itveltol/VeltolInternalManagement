import type { SituationsApiClient, CreateSituationPayload, UpdateSituationPayload, FinalizeSituationPayload } from "../api/types";
import type { Situation, SituationWithProject, SituationFigures, Currency } from "../types";
import { convertCurrency } from "@/shared/utils/currency";

export function getAllSituationsWithProjects(api: SituationsApiClient): Promise<SituationWithProject[]> {
  return api.getAllSituationsWithProjects();
}

export function getSituationsForProject(api: SituationsApiClient, projectId: number): Promise<Situation[]> {
  return api.getSituationsForProject(projectId);
}

export function getAllFinalizedSituations(api: SituationsApiClient): Promise<Situation[]> {
  return api.getAllFinalizedSituations();
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

/** Most recently finalized situation for a project, excluding the given one — the baseline a new situation bills against. */
export function findPreviousFinalized(
  situations: Situation[],
  excludeId: number,
): Situation | null {
  const finalized = situations
    .filter((s) => s.status === "final" && s.id !== excludeId && s.finalized_at != null)
    .sort((a, b) => new Date(b.finalized_at!).getTime() - new Date(a.finalized_at!).getTime());
  return finalized[0] ?? null;
}

/**
 * The figures shown for a situation: frozen snapshot once finalized, or
 * live-computed while draft. pct is the INCREMENTAL Matrice progress since
 * the previous finalized situation for the same project (previousPct), not
 * the project's raw cumulative completion — each situation bills only the
 * work done since the last one, like a real payment certificate. Clamped at
 * 0 in case progress ever regresses between two finalizations.
 *
 * A project only ever has one real source-currency value (value_eur/value_lei
 * — see currency/conversion_rate migration); the other is derived here via
 * the project's own conversion_rate, not computed independently, so it isn't
 * silently null for projects entered in RON.
 */
export function computeSituationFigures(
  situation: Pick<Situation, "status" | "pct_snapshot" | "amount_eur_snapshot" | "amount_lei_snapshot">,
  project: { progress_pct: number; value_eur: number | null; value_lei: number | null; currency: Currency; conversion_rate: number | null },
  previousPct: number,
): SituationFigures {
  if (situation.status === "final") {
    return {
      pct: situation.pct_snapshot,
      amountEur: situation.amount_eur_snapshot,
      amountLei: situation.amount_lei_snapshot,
    };
  }

  const pct = Math.max(0, project.progress_pct - previousPct);
  const sourceValue = project.currency === "EUR" ? project.value_eur : project.value_lei;
  const billedSource = sourceValue != null ? (pct / 100) * sourceValue : null;
  const billedOther = convertCurrency(
    billedSource,
    project.currency,
    project.currency === "EUR" ? "RON" : "EUR",
    project.conversion_rate,
  );

  return {
    pct,
    amountEur: project.currency === "EUR" ? billedSource : billedOther,
    amountLei: project.currency === "RON" ? billedSource : billedOther,
  };
}
