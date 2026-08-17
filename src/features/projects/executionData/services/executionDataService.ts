import type {
  ExecutionDataApiClient,
  UpsertExecutionDataPayload,
  UpsertStructureConfigRowPayload,
} from "../api/types";
import type { ProjectExecutionData, ProjectStructureConfigRow, StructureTotals } from "@/features/projects/executionData/types";

export async function getExecutionData(
  client: ExecutionDataApiClient,
  projectId: number
): Promise<ProjectExecutionData | null> {
  return client.getExecutionData(projectId);
}

export async function upsertExecutionData(
  client: ExecutionDataApiClient,
  payload: UpsertExecutionDataPayload
): Promise<void> {
  return client.upsertExecutionData(payload);
}

export async function getStructureConfig(
  client: ExecutionDataApiClient,
  projectId: number
): Promise<ProjectStructureConfigRow[]> {
  return client.getStructureConfig(projectId);
}

export async function upsertStructureConfigRow(
  client: ExecutionDataApiClient,
  payload: UpsertStructureConfigRowPayload
): Promise<void> {
  return client.upsertStructureConfigRow(payload);
}

export async function deleteStructureConfigRow(
  client: ExecutionDataApiClient,
  id: number
): Promise<void> {
  return client.deleteStructureConfigRow(id);
}

/** Sums mesa_count * per-mesa quantity across every structure-config row for a project. */
export function computeStructureTotals(rows: ProjectStructureConfigRow[]): StructureTotals {
  return rows.reduce<StructureTotals>(
    (acc, r) => ({
      picior: acc.picior + r.mesa_count * (r.picior_per_mesa ?? 0),
      stalp: acc.stalp + r.mesa_count * (r.stalp_per_mesa ?? 0),
      grinzi: acc.grinzi + r.mesa_count * (r.grinzi_per_mesa ?? 0),
      pane: acc.pane + r.mesa_count * (r.pane_per_mesa ?? 0),
    }),
    { picior: 0, stalp: 0, grinzi: 0, pane: 0 }
  );
}

/** Total labor cost: allocated budget spread over deadline days, scaled by days actually spent. */
export function computeLaborCost(
  budgetEur: number | null,
  deadlineDays: number | null,
  realDays: number | null
): number | null {
  if (!budgetEur || !deadlineDays || !realDays) return null;
  return (budgetEur / deadlineDays) * realDays;
}

/**
 * Maps structure-total keys to the checklist item_number whose plan_total
 * they should drive — item numbers match checklistTemplate.ts's PV_TEMPLATE
 * (item 4 "Batere stâlpi", 5/6 "Montaj grinzi longitudinale/verticale" split
 * the beam total across both rows, 44 "Montaj pane"). Keep in sync if the
 * template's item numbers ever change.
 */
export const STRUCTURE_TOTAL_ITEM_NUMBERS: { key: keyof StructureTotals; itemNumbers: number[] }[] = [
  { key: "stalp", itemNumbers: [4] },
  { key: "grinzi", itemNumbers: [5, 6] },
  { key: "pane", itemNumbers: [44] },
];

/**
 * Builds { itemNumber, plan_total } overrides from structure totals — grinzi
 * total is split evenly (longitudinal + vertical rows aren't distinguished
 * in the structure config sheet) since the source spreadsheet only tracks a
 * combined "nr.grinzi total".
 */
export function buildStructurePlanTotalOverrides(
  totals: StructureTotals
): { itemNumber: number; plan_total: number }[] {
  return STRUCTURE_TOTAL_ITEM_NUMBERS.flatMap(({ key, itemNumbers }) => {
    const total = totals[key];
    const per = Math.round(total / itemNumbers.length);
    return itemNumbers.map((itemNumber) => ({ itemNumber, plan_total: per }));
  });
}
