import type { Activity, MatrixCell, MatrixProject, ActivityStatus } from '../types';

export interface MatriceApiClient {
  getActivities(): Promise<Activity[]>;
  getCells(projectIds: number[]): Promise<MatrixCell[]>;
  getProjects(projectIds: number[]): Promise<MatrixProject[]>;
  getAllProjects(): Promise<MatrixProject[]>;
  setCellStatus(
    projectId: number,
    activityId: number,
    status: ActivityStatus,
    userId: string,
  ): Promise<void>;
}
