"use client";

import { ProjectsTable } from "./ProjectsTable";
import type { Project, ProjectManager } from "../types";

interface Props {
  projects: Project[];
  canMutate: boolean;
  managers: ProjectManager[];
}

export function ProjectsShell({ projects, canMutate, managers }: Props) {
  return <ProjectsTable projects={projects} canMutate={canMutate} managers={managers} />;
}
