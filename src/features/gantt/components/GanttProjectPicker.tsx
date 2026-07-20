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
  hiddenProjects: Project[];
  onUnhide: (id: number) => void;
}

export function GanttProjectPicker({ hiddenProjects, onUnhide }: Props) {
  const t = useTranslations("gantt");
  const filter = useComboboxFilter({ multiple: true });

  if (hiddenProjects.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-veltol-fgMute">{t("picker.label")}</span>
      <Combobox
        items={hiddenProjects}
        value={[]}
        onValueChange={(next: Project[]) => {
          const added = next[next.length - 1];
          if (added) onUnhide(added.id);
        }}
        itemToStringLabel={(p) => p.name}
        filter={filter.contains}
        multiple
      >
        <ComboboxInputGroup>
          <ComboboxInput placeholder={t("picker.placeholder")} />
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
