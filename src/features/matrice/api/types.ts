import type { Activity, ActivityDependency, MatricePhase, MatrixCell, MatrixProject, ActivityStatus } from '../types';

export interface MatriceApiClient {
  getActivities(): Promise<Activity[]>;
  getPhases(): Promise<MatricePhase[]>;
  getDependencies(): Promise<ActivityDependency[]>;
  getCells(projectIds: number[]): Promise<MatrixCell[]>;
  getProjects(projectIds: number[]): Promise<MatrixProject[]>;
  getAllProjects(): Promise<MatrixProject[]>;
  setCellStatus(
    projectId: number,
    activityId: number,
    status: ActivityStatus,
    userId: string,
    expiresAt?: string | null,
  ): Promise<void>;
}

/** Thrown by setCellStatus when the DB's dependency-enforcement trigger
 * rejects the write (unmet prerequisite activity) — lets the action layer
 * distinguish this from a generic failure without string-matching. */
export class DependencyError extends Error {}
