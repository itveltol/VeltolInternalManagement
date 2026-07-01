"use client";

import { ProjectsTable } from "./ProjectsTable";
import type { Project, ProjectManager } from "../types";
import type { ClientRef } from "@/features/clients/types";

interface Props {
  projects: Project[];
  canMutate: boolean;
  managers: ProjectManager[];
  clientRefs: ClientRef[];
}

export function ProjectsShell({ projects, canMutate, managers, clientRefs }: Props) {
  return <ProjectsTable projects={projects} canMutate={canMutate} managers={managers} clientRefs={clientRefs} />;
}
