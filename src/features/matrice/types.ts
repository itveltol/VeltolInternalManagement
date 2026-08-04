import type { ContractType, ProjectType } from "@/features/projects/types";

export type { ProjectType };

export type ActivityStatus =
  | 'finalizat'
  | 'in_progres'
  | 'in_asteptare'
  | 'blocat'
  | 'neinceput'
  | 'na';

export interface Activity {
  id: number;
  phase_no: number;
  phase_name: string;
  name: string;
  sort_order: number;
  is_section_header: boolean;
  applies_to: ProjectType[] | null;
  /** Periodic permit/notice — completing it requires an expiry date and is tracked for renewal reminders. */
  is_aviz: boolean;
}

export interface ProjectActivityStatus {
  project_id: number;
  activity_id: number;
  status: ActivityStatus;
  note: string | null;
  updated_by: string | null;
  updated_at: string;
  /** Renewal date for aviz activities; null for everything else. */
  expires_at: string | null;
}

export interface MatrixProject {
  id: number;
  name: string;
  project_type: ProjectType | null;
  contract_type: ContractType[];
}

/** Resolved cell for the matrix grid (missing DB row → 'neinceput') */
export interface MatrixCell {
  activity_id: number;
  project_id: number;
  status: ActivityStatus;
  note: string | null;
  expires_at: string | null;
}

export interface MatrixData {
  activities: Activity[];
  cells: MatrixCell[];
  projects: MatrixProject[];
}

export const ACTIVITY_STATUS_VALUES: ActivityStatus[] = [
  'finalizat',
  'in_progres',
  'in_asteptare',
  'blocat',
  'neinceput',
  'na',
];

export const STATUS_COLOR: Record<ActivityStatus, string> = {
  finalizat:     'bg-[var(--v-success-bg)] text-[var(--v-success)] border-transparent',
  in_progres:    'bg-veltol-tint text-veltol-primary border-transparent',
  in_asteptare:  'bg-[var(--v-warning-bg)] text-[var(--v-warning)] border-transparent',
  blocat:        'bg-[var(--v-danger-bg)] text-[var(--v-danger)] border-transparent',
  neinceput:     'bg-veltol-surface text-veltol-fgDim border-transparent',
  na:            'bg-transparent text-veltol-faint border border-dashed border-veltol-border',
};

/** Solid swatch color for the small status dot in dropdown menus — stays
 * visible even for statuses whose pill background is very pale. */
export const STATUS_DOT_COLOR: Record<ActivityStatus, string> = {
  finalizat:     'bg-[var(--v-success)]',
  in_progres:    'bg-veltol-primary',
  in_asteptare:  'bg-[var(--v-warning)]',
  blocat:        'bg-[var(--v-danger)]',
  neinceput:     'bg-veltol-faint',
  na:            'bg-transparent border border-veltol-border',
};

/** Renewal state for a finished aviz cell, relative to today. */
export type AvizState = 'needsAttention' | 'done' | 'notDue' | 'noExpiry';

export interface AvizReminder {
  projectId: number;
  projectName: string;
  activityId: number;
  activityName: string;
  expiresAt: string;
  state: AvizState;
}
