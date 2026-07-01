export type VacationStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface VacationRequest {
  id: number;
  user_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: VacationStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  requester: { first_name: string | null; last_name: string | null };
  approver: { first_name: string | null; last_name: string | null } | null;
}

export const VACATION_STATUSES: VacationStatus[] = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
];

export function vacationDays(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}
