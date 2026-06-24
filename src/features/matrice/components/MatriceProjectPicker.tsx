"use client";

import { useTranslations } from "next-intl";
import type { MatrixProject } from "../types";
import { cn } from "@/shared/utils/cn";

interface Props {
  allProjects: MatrixProject[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

export function MatriceProjectPicker({ allProjects, selectedIds, onChange }: Props) {
  const t = useTranslations("matrice");

  function toggle(id: number) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="mono-label text-[9px] text-veltol-fgMute">{t("picker.label")}</span>
      <div className="flex flex-wrap gap-1.5">
        {allProjects.map((p) => {
          const active = selectedIds.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className={cn(
                "rounded-md border px-3 py-1 text-[12px] font-medium transition-colors",
                active
                  ? "border-veltol-aqua/40 bg-veltol-aqua/10 text-veltol-aqua"
                  : "border-white/[0.07] bg-veltol-surface/40 text-veltol-fg/70 hover:bg-veltol-surface/70 hover:text-veltol-fg",
              )}
            >
              {p.name}
              {p.project_type && (
                <span className="ml-1.5 font-mono text-[9px] opacity-60">{p.project_type}</span>
              )}
            </button>
          );
        })}
        {allProjects.length === 0 && (
          <span className="text-sm text-veltol-fgMute">{t("picker.empty")}</span>
        )}
      </div>
    </div>
  );
}
