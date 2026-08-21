import type { MatriceAdminApiClient } from "../api/types";
import type { Activity, ActivityDependency, MatriceCatalog, MatricePhase, PhaseWithActivities } from "../types";

export async function getCatalog(client: MatriceAdminApiClient): Promise<MatriceCatalog> {
  const [phases, activities, dependencies, checklistLinkedActivityIds] = await Promise.all([
    client.getPhases(),
    client.getActivities(),
    client.getDependencies(),
    client.getChecklistLinkedActivityIds(),
  ]);
  const activitiesByPhase = new Map<number, Activity[]>();
  for (const a of activities) {
    const list = activitiesByPhase.get(a.phase_id);
    if (list) list.push(a);
    else activitiesByPhase.set(a.phase_id, [a]);
  }
  const sortedPhases = [...phases].sort((a, b) => a.sort_order - b.sort_order);
  const withActivities: PhaseWithActivities[] = sortedPhases.map((phase) => ({
    ...phase,
    activities: (activitiesByPhase.get(phase.id) ?? []).sort((a, b) => a.sort_order - b.sort_order),
  }));
  return { phases: withActivities, dependencies, checklistLinkedActivityIds };
}

/** Adjacent-swap reorder within an already sort_order-sorted list; returns the two rows whose sort_order must be swapped, or null if the move is out of bounds. */
export function computeAdjacentSwap<T extends { id: number; sort_order: number }>(
  items: T[],
  id: number,
  direction: "up" | "down",
): [T, T] | null {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return null;
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= items.length) return null;
  return [items[index], items[targetIndex]];
}

export function nextSortOrderForPhase(activities: Activity[], phaseId: number): number {
  const inPhase = activities.filter((a) => a.phase_id === phaseId);
  if (inPhase.length === 0) return 0;
  return Math.max(...inPhase.map((a) => a.sort_order)) + 1;
}

export function nextPhaseSortOrder(phases: MatricePhase[]): number {
  if (phases.length === 0) return 0;
  return Math.max(...phases.map((p) => p.sort_order)) + 1;
}

/** Client-side advisory cycle check (mirrors fn_prevent_dependency_cycle) — the DB trigger remains authoritative. */
export function wouldCreateCycle(
  dependencies: ActivityDependency[],
  activityId: number,
  dependsOnActivityId: number,
): boolean {
  if (activityId === dependsOnActivityId) return true;
  const reachable = new Set<number>([dependsOnActivityId]);
  const stack = [dependsOnActivityId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const dep of dependencies) {
      if (dep.activity_id === current && !reachable.has(dep.depends_on_activity_id)) {
        reachable.add(dep.depends_on_activity_id);
        stack.push(dep.depends_on_activity_id);
      }
    }
  }
  return reachable.has(activityId);
}
