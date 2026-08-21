"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Combobox,
  ComboboxInputGroup,
  ComboboxValue,
  ComboboxInput,
  ComboboxClear,
  ComboboxPortal,
  ComboboxPositioner,
  ComboboxPopup,
  ComboboxList,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxEmpty,
} from "@/shared/components/ui/combobox";
import type { ScheduleEntryProject } from "../types";

interface Props {
  value: ScheduleEntryProject | null;
  onChange: (project: ScheduleEntryProject | null) => void;
  searchProjects: (query: string) => Promise<ScheduleEntryProject[]>;
}

export function ProjectPicker({ value, onChange, searchProjects }: Props) {
  const t = useTranslations("schedule");
  const [items, setItems] = useState<ScheduleEntryProject[]>(value ? [value] : []);
  const [isSearching, startSearch] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    startSearch(async () => {
      const results = await searchProjects("");
      setItems(results);
    });
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchProjects]);

  function handleInputValueChange(query: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startSearch(async () => {
        const results = await searchProjects(query);
        setItems(results);
      });
    }, 250);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-veltol-fgMute">{t("entry.project")}</span>
      <Combobox
        items={items}
        value={value}
        onValueChange={onChange}
        onInputValueChange={handleInputValueChange}
        itemToStringLabel={(p: ScheduleEntryProject) => p.name}
      >
        <ComboboxInputGroup>
          <ComboboxValue />
          <ComboboxInput placeholder={t("entry.projectPlaceholder")} />
          <ComboboxClear />
        </ComboboxInputGroup>
        <ComboboxPortal>
          <ComboboxPositioner>
            <ComboboxPopup>
              <ComboboxEmpty>
                {isSearching ? t("entry.searching") : t("entry.noProjects")}
              </ComboboxEmpty>
              <ComboboxList>
                {(p: ScheduleEntryProject) => (
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
