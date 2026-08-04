"use client";

import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import type { Project } from "@/features/projects/types";
import {
  Combobox,
  ComboboxInputGroup,
  ComboboxInput,
  ComboboxClear,
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
  projects: Project[];
  value: Project | null;
  onValueChange: (project: Project | null) => void;
  name?: string;
}

export function SituationProjectCombobox({ projects, value, onValueChange, name }: Props) {
  const t = useTranslations("situations");
  const filter = useComboboxFilter({ multiple: false });

  return (
    <Combobox
      items={projects}
      value={value}
      onValueChange={(next: Project | null) => onValueChange(next)}
      itemToStringLabel={(p) => p?.name ?? ""}
      itemToStringValue={(p) => (p ? String(p.id) : "")}
      filter={filter.contains}
      name={name}
    >
      <ComboboxInputGroup className="h-8 min-h-0 py-0">
        <Search className="size-3.5 shrink-0 text-veltol-faint" />
        <ComboboxInput placeholder={t("selectProjectPlaceholder")} className="text-sm" />
        <ComboboxClear className="ml-auto shrink-0" aria-label={t("selectProjectClear")}>
          <X className="size-3.5" />
        </ComboboxClear>
      </ComboboxInputGroup>
      <ComboboxPortal>
        <ComboboxPositioner>
          <ComboboxPopup>
            <ComboboxEmpty>{t("selectProjectNoResults")}</ComboboxEmpty>
            <ComboboxList>
              {(p: Project) => (
                <ComboboxItem key={p.id} value={p}>
                  <ComboboxItemIndicator />
                  {p.name}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxPopup>
        </ComboboxPositioner>
      </ComboboxPortal>
    </Combobox>
  );
}
