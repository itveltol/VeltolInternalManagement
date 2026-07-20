"use client";

import { useTranslations } from "next-intl";
import type { Project } from "@/features/projects/types";
import {
  Combobox,
  ComboboxInputGroup,
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
  pickableProjects: Project[];
  onAdd: (id: number) => void;
  disabled: boolean;
  maxProjects: number;
  shownCount: number;
}

export function GanttProjectPicker({ pickableProjects, onAdd, disabled, maxProjects, shownCount }: Props) {
  const t = useTranslations("gantt");
  const filter = useComboboxFilter({ multiple: true });

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-veltol-fgMute">
        {t("picker.label")} ({shownCount}/{maxProjects})
      </span>
      <Combobox
        items={pickableProjects}
        value={[]}
        onValueChange={(next: Project[]) => {
          const added = next[next.length - 1];
          if (added) onAdd(added.id);
        }}
        itemToStringLabel={(p) => p.name}
        filter={filter.contains}
        disabled={disabled}
        multiple
      >
        <ComboboxInputGroup>
          <ComboboxInput placeholder={disabled ? t("picker.maxReached") : t("picker.placeholder")} />
        </ComboboxInputGroup>
        <ComboboxPortal>
          <ComboboxPositioner>
            <ComboboxPopup>
              <ComboboxEmpty>{t("picker.noResults")}</ComboboxEmpty>
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
    </div>
  );
}
