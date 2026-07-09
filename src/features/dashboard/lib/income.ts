import type { DashboardProject } from "@/app/[locale]/(app)/dashboard/action";

export interface MonthlyIncomePoint {
  month: number;
  year: number;
  totalEur: number;
  projectCount: number;
}

export interface MonthKey {
  year: number;
  month: number;
}

function projectsWithDeadline(projects: DashboardProject[]) {
  return projects.filter((p) => p.deadline != null);
}

export function getAvailableYears(projects: DashboardProject[]): number[] {
  const years = new Set<number>();
  for (const p of projectsWithDeadline(projects)) {
    years.add(new Date(p.deadline!).getUTCFullYear());
  }
  return [...years].sort((a, b) => b - a);
}

export function getMonthlyIncomeForYear(
  projects: DashboardProject[],
  year: number,
): MonthlyIncomePoint[] {
  const buckets: MonthlyIncomePoint[] = Array.from({ length: 12 }, (_, month) => ({
    month,
    year,
    totalEur: 0,
    projectCount: 0,
  }));

  for (const p of projectsWithDeadline(projects)) {
    const d = new Date(p.deadline!);
    if (d.getUTCFullYear() !== year) continue;
    const bucket = buckets[d.getUTCMonth()];
    bucket.totalEur += p.value_eur ?? 0;
    bucket.projectCount += 1;
  }

  return buckets;
}

export function getIncomeForMonths(
  projects: DashboardProject[],
  keys: MonthKey[],
): MonthlyIncomePoint[] {
  const withDeadline = projectsWithDeadline(projects);
  return keys.map(({ year, month }) => {
    let totalEur = 0;
    let projectCount = 0;
    for (const p of withDeadline) {
      const d = new Date(p.deadline!);
      if (d.getUTCFullYear() === year && d.getUTCMonth() === month) {
        totalEur += p.value_eur ?? 0;
        projectCount += 1;
      }
    }
    return { year, month, totalEur, projectCount };
  });
}

export function countProjectsWithoutDeadline(projects: DashboardProject[]): number {
  return projects.filter((p) => p.deadline == null).length;
}
