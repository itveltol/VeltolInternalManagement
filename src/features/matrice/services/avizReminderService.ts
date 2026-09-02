import type { Activity, AvizReminder, AvizState, MatrixCell, MatrixProject } from '../types';

export const AVIZ_LOOKAHEAD_DAYS = 60;

function daysBetween(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / msPerDay);
}

/** Renewal state for a finished aviz cell's expiry date relative to today. */
export function getAvizState(expiresAt: string | null, today: Date): AvizState {
  if (!expiresAt) return 'noExpiry';
  const expiry = new Date(`${expiresAt}T00:00:00.000Z`);
  const daysLeft = daysBetween(today, expiry);
  if (daysLeft < 0) return 'overdue';
  return daysLeft <= AVIZ_LOOKAHEAD_DAYS ? 'dueSoon' : 'notDue';
}

const DEFAULT_INCLUDE_STATES: AvizState[] = ['overdue', 'dueSoon'];

/** All finished aviz cells across the given projects/activities, filtered to `includeStates` (default: overdue + due soon). */
export function buildAvizReminders(
  activities: Activity[],
  cells: MatrixCell[],
  projects: MatrixProject[],
  today: Date,
  options?: { includeStates?: AvizState[] },
): AvizReminder[] {
  const includeStates = options?.includeStates ?? DEFAULT_INCLUDE_STATES;
  const avizActivities = activities.filter((a) => a.is_aviz);
  if (avizActivities.length === 0) return [];

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const reminders: AvizReminder[] = [];

  for (const cell of cells) {
    if (cell.status !== 'finalizat' || !cell.expires_at) continue;
    const activity = avizActivities.find((a) => a.id === cell.activity_id);
    if (!activity) continue;
    const project = projectById.get(cell.project_id);
    if (!project) continue;

    const state = getAvizState(cell.expires_at, today);
    if (!includeStates.includes(state)) continue;

    reminders.push({
      projectId: project.id,
      projectName: project.name,
      activityId: activity.id,
      activityName: activity.name,
      expiresAt: cell.expires_at,
      state,
    });
  }

  return reminders;
}
