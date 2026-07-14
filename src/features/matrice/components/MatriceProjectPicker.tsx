"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { MatrixProject } from "../types";
import {
  Combobox,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxInputGroup,
  ComboboxValue,
  ComboboxInput,
  ComboboxPortal,
  ComboboxPositioner,
  ComboboxPopup,
  ComboboxList,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxEmpty,
  useComboboxFilter,
} from "@/shared/components/ui/combobox";

interface Props {
  allProjects: MatrixProject[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

export function MatriceProjectPicker({ allProjects, selectedIds, onChange }: Props) {
  const t = useTranslations("matrice");
  const filter = useComboboxFilter({ multiple: true });

  const selected = useMemo(
    () => allProjects.filter((p) => selectedIds.includes(p.id)),
    [allProjects, selectedIds],
  );

  if (allProjects.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-veltol-fgMute">{t("picker.label")}</span>
        <span className="text-sm text-veltol-fgMute">{t("picker.empty")}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-veltol-fgMute">{t("picker.label")}</span>
      <Combobox
        items={allProjects}
        value={selected}
        onValueChange={(next) => onChange(next.map((p) => p.id))}
        itemToStringLabel={(p) => p.name}
        filter={filter.contains}
        multiple
      >
        <div className="flex flex-col gap-2">
          <ComboboxValue>
            {(value: MatrixProject[]) =>
              value.length > 0 && (
                <ComboboxChips>
                  {value.map((p) => (
                    <ComboboxChip key={p.id} aria-label={p.name}>
                      {p.name}
                      {p.project_type && (
                        <span className="ml-1 font-mono text-[9px] opacity-60">{p.project_type}</span>
                      )}
                      <ComboboxChipRemove aria-label={t("picker.remove", { name: p.name })} />
                    </ComboboxChip>
                  ))}
                </ComboboxChips>
              )
            }
          </ComboboxValue>
          <ComboboxInputGroup>
            <ComboboxInput placeholder={t("picker.placeholder")} />
          </ComboboxInputGroup>
        </div>
        <ComboboxPortal>
          <ComboboxPositioner>
            <ComboboxPopup>
              <ComboboxEmpty>{t("picker.noResults")}</ComboboxEmpty>
              <ComboboxList>
                {(p: MatrixProject) => (
                  <ComboboxItem key={p.id} value={p}>
                    <ComboboxItemIndicator />
                    {p.name}
                    {p.project_type && (
                      <span className="ml-1.5 font-mono text-[9px] opacity-60">{p.project_type}</span>
                    )}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxPopup>
          </ComboboxPositioner>
        </ComboboxPortal>
      </Combobox>
    </div>
  );
}
