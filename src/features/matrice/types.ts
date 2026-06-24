export type ActivityStatus =
  | 'finalizat'
  | 'in_progres'
  | 'in_asteptare'
  | 'blocat'
  | 'neinceput'
  | 'na';

export type ProjectType =
  | 'CEF'
  | 'CEF cu BESS'
  | 'BESS in CEF existent'
  | 'BESS Stand-alone';

export interface Activity {
  id: number;
  phase_no: number;
  phase_name: string;
  name: string;
  sort_order: number;
  is_section_header: boolean;
  applies_to: ProjectType[] | null;
}

export interface ProjectActivityStatus {
  project_id: number;
  activity_id: number;
  status: ActivityStatus;
  note: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface MatrixProject {
  id: number;
  name: string;
  project_type: ProjectType | null;
}

/** Resolved cell for the matrix grid (missing DB row → 'neinceput') */
export interface MatrixCell {
  activity_id: number;
  project_id: number;
  status: ActivityStatus;
  note: string | null;
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
  finalizat:     'bg-veltol-green/20 text-veltol-green border-veltol-green/30',
  in_progres:    'bg-veltol-aqua/20 text-veltol-aqua border-veltol-aqua/30',
  in_asteptare:  'bg-veltol-amber/20 text-veltol-amber border-veltol-amber/30',
  blocat:        'bg-veltol-red/20 text-veltol-red border-veltol-red/30',
  neinceput:     'bg-veltol-fgMute/10 text-veltol-fgMute border-veltol-fgMute/20',
  na:            'bg-transparent text-veltol-fgMute/40 border-transparent',
};
