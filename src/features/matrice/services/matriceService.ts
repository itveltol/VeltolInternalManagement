import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/core/supabase/admin';
import { createSupabaseMatriceClient } from '../api/supabaseMatriceClient';
import type { MatriceApiClient } from '../api/types';
import type { Activity, ActivityDependency, MatricePhase, MatrixCell, MatrixData, ActivityStatus, MatrixProject } from '../types';

// `activities`/`matrice_phases` are now admin-editable (see
// settings/matrice-catalog), but still change rarely relative to page loads,
// so caching remains worthwhile. Every mutating action in
// settings/matrice-catalog/actions.ts calls updateTag('activities') so
// edits show up immediately (read-your-own-writes) rather than after a
// stale-while-revalidate delay.
export const getCachedActivities = unstable_cache(
  async (): Promise<Activity[]> => {
    const client = createSupabaseMatriceClient(createAdminClient());
    return client.getActivities();
  },
  ['matrice-activities'],
  { tags: ['activities'] },
);

export const getCachedPhases = unstable_cache(
  async (): Promise<MatricePhase[]> => {
    const client = createSupabaseMatriceClient(createAdminClient());
    return client.getPhases();
  },
  ['matrice-phases'],
  { tags: ['activities'] },
);

export const getCachedDependencies = unstable_cache(
  async (): Promise<ActivityDependency[]> => {
    const client = createSupabaseMatriceClient(createAdminClient());
    return client.getDependencies();
  },
  ['matrice-dependencies'],
  { tags: ['activities'] },
);

/** Whether a project's contract currently covers the given phase's service */
export function isPhaseEnabled(project: MatrixProject, phase: MatricePhase): boolean {
  return project.contract_type.includes(phase.service_type);
}

export async function getMatrix(
  client: MatriceApiClient,
  projectIds: number[],
): Promise<MatrixData> {
  const [activities, phases, dependencies, cells, projects] = await Promise.all([
    getCachedActivities(),
    getCachedPhases(),
    getCachedDependencies(),
    client.getCells(projectIds),
    client.getProjects(projectIds),
  ]);
  return { activities, phases, cells, projects, dependencies };
}

export async function getAllProjects(client: MatriceApiClient): Promise<MatrixProject[]> {
  return client.getAllProjects();
}

export async function setCellStatus(
  client: MatriceApiClient,
  projectId: number,
  activityId: number,
  status: ActivityStatus,
  userId: string,
  expiresAt?: string | null,
): Promise<void> {
  return client.setCellStatus(projectId, activityId, status, userId, expiresAt);
}

/** Client-side: names of prerequisite activities that aren't yet 'finalizat'
 * for this project — mirrors the DB's fn_enforce_activity_dependencies
 * trigger so the UI can warn before attempting the write. */
export function getUnmetDependencyNames(
  activities: Activity[],
  dependencies: ActivityDependency[],
  cells: MatrixCell[],
  projectId: number,
  activityId: number,
): string[] {
  const activityById = new Map(activities.map(a => [a.id, a]));
  return dependencies
    .filter(d => d.activity_id === activityId)
    .filter(d => resolveStatus(cells, projectId, d.depends_on_activity_id) !== 'finalizat')
    .map(d => activityById.get(d.depends_on_activity_id)?.name)
    .filter((name): name is string => !!name);
}

/** Client-side: resolve a cell status (missing row = 'neinceput') */
export function resolveStatus(
  cells: MatrixCell[],
  projectId: number,
  activityId: number,
): ActivityStatus {
  return cells.find(c => c.project_id === projectId && c.activity_id === activityId)?.status ?? 'neinceput';
}

/** Client-side: compute per-project % complete (excludes na + section headers + phases not covered by the contract) */
export function projectCompletionPct(
  activities: Activity[],
  phaseById: Map<number, MatricePhase>,
  cells: MatrixCell[],
  projectId: number,
  project?: MatrixProject,
): number {
  const eligible = activities.filter(a => {
    if (a.is_section_header) return false;
    if (!project) return true;
    const phase = phaseById.get(a.phase_id);
    return !phase || isPhaseEnabled(project, phase);
  });
  const nonNa = eligible.filter(a => resolveStatus(cells, projectId, a.id) !== 'na');
  if (nonNa.length === 0) return 0;
  const done = nonNa.filter(a => resolveStatus(cells, projectId, a.id) === 'finalizat');
  return Math.round((done.length / nonNa.length) * 100);
}

/** Client-side: compute per-phase % complete for a project */
export function phaseCompletionPct(
  activities: Activity[],
  cells: MatrixCell[],
  projectId: number,
  phaseId: number,
): number {
  const eligible = activities.filter(a => a.phase_id === phaseId && !a.is_section_header);
  const nonNa = eligible.filter(a => resolveStatus(cells, projectId, a.id) !== 'na');
  if (nonNa.length === 0) return 0;
  const done = nonNa.filter(a => resolveStatus(cells, projectId, a.id) === 'finalizat');
  return Math.round((done.length / nonNa.length) * 100);
}

/** Client-side: compute per-activity row % complete across selected projects */
export function activityRowPct(
  cells: MatrixCell[],
  activityId: number,
  projectIds: number[],
): number {
  const nonNa = projectIds.filter(pid => resolveStatus(cells, pid, activityId) !== 'na');
  if (nonNa.length === 0) return 0;
  const done = nonNa.filter(pid => resolveStatus(cells, pid, activityId) === 'finalizat');
  return Math.round((done.length / nonNa.length) * 100);
}
