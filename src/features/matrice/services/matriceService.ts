import type { MatriceApiClient } from '../api/types';
import type { Activity, MatrixCell, MatrixData, ActivityStatus, MatrixProject } from '../types';
import type { ContractType } from '@/features/projects/types';

/**
 * Matrice phase_no ranges rolled up to the contract's service scope, mirroring
 * GANTT_PHASE_MATRICE_RANGE (planning=1-7, execution=8-10, autorizare=11-12):
 * these are workflow stages, contract_type is which services are contracted —
 * this bridges the two so excluded services can be grayed out, not deleted.
 */
export function contractTypeForPhase(phaseNo: number): ContractType {
  if (phaseNo <= 7) return 'proiectare';
  if (phaseNo <= 10) return 'executie';
  return 'mentenanta';
}

/** Whether a project's contract currently covers the given phase's service */
export function isPhaseEnabled(project: MatrixProject, phaseNo: number): boolean {
  return project.contract_type.includes(contractTypeForPhase(phaseNo));
}

export async function getMatrix(
  client: MatriceApiClient,
  projectIds: number[],
): Promise<MatrixData> {
  const [activities, cells, projects] = await Promise.all([
    client.getActivities(),
    client.getCells(projectIds),
    client.getProjects(projectIds),
  ]);
  return { activities, cells, projects };
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
): Promise<void> {
  return client.setCellStatus(projectId, activityId, status, userId);
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
  cells: MatrixCell[],
  projectId: number,
  project?: MatrixProject,
): number {
  const eligible = activities.filter(a => !a.is_section_header && (!project || isPhaseEnabled(project, a.phase_no)));
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
  phaseNo: number,
): number {
  const eligible = activities.filter(a => a.phase_no === phaseNo && !a.is_section_header);
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
