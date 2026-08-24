"use client";

import { usePathname, Link } from "@/i18n/navigation";
import type { Project } from "@/features/projects/types";

interface Props {
  clientId: number;
  projects: Project[];
}

export function ClientProjectTabs({ clientId, projects }: Props) {
  const pathname = usePathname();
  const activeProjectId = Number(pathname.match(/\/projects\/(\d+)/)?.[1]);

  if (projects.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 border-b border-border">
      {projects.map((project) => {
        const active = project.id === activeProjectId;
        return (
          <Link
            key={project.id}
            href={`/clients/${clientId}/projects/${project.id}`}
            className={
              active
                ? "rounded-t-md border border-b-0 border-veltol-accent/25 bg-veltol-accent/10 px-4 py-2 text-[13px] font-semibold text-veltol-accent"
                : "px-4 py-2 text-[13px] text-veltol-fgMute transition-colors hover:text-veltol-fgDim"
            }
          >
            {project.name}
          </Link>
        );
      })}
    </div>
  );
}
