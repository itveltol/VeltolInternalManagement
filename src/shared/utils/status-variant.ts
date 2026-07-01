import type { ProjectStatus, ProjectPriority, ProjectPhase } from "@/features/projects/types";
import type { VacationStatus } from "@/features/vacation/types";

type BadgeVariant =
  | "outline"
  | "info"
  | "warning"
  | "default"
  | "success"
  | "secondary"
  | "destructive";

const PHASE_VARIANT: Record<ProjectPhase, BadgeVariant> = {
  proposal:     "outline",
  planning:     "info",
  permitting:   "warning",
  construction: "default",
  warranty:     "success",
  closed:       "secondary",
  cancelled:    "destructive",
};

export function statusVariant(status: ProjectPhase): BadgeVariant {
  return PHASE_VARIANT[status] ?? "secondary";
}

export function phaseVariant(phase: ProjectPhase): BadgeVariant {
  return PHASE_VARIANT[phase] ?? "secondary";
}

export function projectStatusVariant(status: ProjectStatus): BadgeVariant {
  const map: Record<ProjectStatus, BadgeVariant> = {
    on_schedule: "success",
    delayed:     "warning",
    critical:    "destructive",
    completed:   "secondary",
    on_hold:     "outline",
  };
  return map[status] ?? "secondary";
}

export function priorityVariant(priority: ProjectPriority): BadgeVariant {
  const map: Record<ProjectPriority, BadgeVariant> = {
    low:    "secondary",
    medium: "info",
    high:   "destructive",
  };
  return map[priority] ?? "secondary";
}

export function vacationStatusVariant(status: VacationStatus): BadgeVariant {
  const map: Record<VacationStatus, BadgeVariant> = {
    pending:   "warning",
    approved:  "success",
    rejected:  "destructive",
    cancelled: "secondary",
  };
  return map[status] ?? "secondary";
}
