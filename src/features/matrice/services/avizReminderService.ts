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
  return daysLeft <= AVIZ_LOOKAHEAD_DAYS ? 'needsAttention' : 'notDue';
}

/** All finished aviz cells across the given projects/activities that need renewal attention. */
export function buildAvizReminders(
  activities: Activity[],
  cells: MatrixCell[],
  projects: MatrixProject[],
  today: Date,
): AvizReminder[] {
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
    if (state !== 'needsAttention') continue;

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
