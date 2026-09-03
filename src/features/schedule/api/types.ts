export interface AssignmentMemberInput {
  profile_id: string | null;
  team_worker_id: number | null;
}

export interface CreateAssignmentPayload {
  project_id: number | null;
  pm_id: string | null;
  sales_id: string | null;
  members: AssignmentMemberInput[];
  start_date: string;
  end_date: string;
  label: string;
  color: string | null;
}

export interface UpdateAssignmentPayload {
  project_id: number | null;
  pm_id: string | null;
  sales_id: string | null;
  start_date: string;
  end_date: string;
  label: string;
  color: string | null;
}

export interface AssignmentDayPayload {
  delegated: boolean;
  plus_hours: number;
}

export interface RawAssignmentMember {
  profile_id: string | null;
  team_worker_id: number | null;
  profile: { id: string; first_name: string | null; last_name: string | null; email: string } | null;
  team_worker: { id: number; first_name: string; last_name: string | null } | null;
}

export interface RawScheduleAssignment {
  id: number;
  project_id: number | null;
  pm_id: string | null;
  sales_id: string | null;
  start_date: string;
  end_date: string;
  label: string;
  color: string | null;
  project: { id: number; name: string } | null;
  pm: { id: string; first_name: string | null; last_name: string | null } | null;
  sales: { id: string; first_name: string | null; last_name: string | null } | null;
  members: RawAssignmentMember[];
}

export interface ScheduleAssignmentDayRow {
  assignment_id: number;
  work_date: string;
  delegated: boolean;
  plus_hours: number;
}

export interface ScheduleApiClient {
  getAssignmentsForRange(rangeStart: string, rangeEnd: string): Promise<RawScheduleAssignment[]>;
  getAssignmentById(id: number): Promise<RawScheduleAssignment | null>;
  getAssignmentDaysForAssignments(
    assignmentIds: number[],
    rangeStart: string,
    rangeEnd: string,
  ): Promise<ScheduleAssignmentDayRow[]>;
  createAssignment(payload: CreateAssignmentPayload, userId: string): Promise<{ id: number }>;
  updateAssignment(id: number, payload: UpdateAssignmentPayload, userId: string): Promise<void>;
  replaceAssignmentMembers(assignmentId: number, members: AssignmentMemberInput[]): Promise<void>;
  deleteAssignment(id: number): Promise<void>;
  pruneAssignmentDaysOutsideRange(assignmentId: number, start: string, end: string): Promise<void>;
  upsertAssignmentDay(
    assignmentId: number,
    workDate: string,
    payload: AssignmentDayPayload,
    userId: string,
  ): Promise<void>;
}
