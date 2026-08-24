"use client";

import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import type { SubcontractorRef } from "../types";
import { cn } from "@/shared/utils/cn";
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
  subcontractors: SubcontractorRef[];
  value: SubcontractorRef | null;
  onValueChange: (subcontractor: SubcontractorRef | null) => void;
  name?: string;
  "aria-invalid"?: boolean;
}

export function SubcontractorCombobox({ subcontractors, value, onValueChange, name, "aria-invalid": invalid }: Props) {
  const t = useTranslations("projects");
  const filter = useComboboxFilter({ multiple: false });

  return (
    <Combobox
      items={subcontractors}
      value={value}
      onValueChange={(next: SubcontractorRef | null) => onValueChange(next)}
      itemToStringLabel={(s) => s?.name ?? ""}
      itemToStringValue={(s) => (s ? String(s.id) : "")}
      filter={filter.contains}
      name={name}
    >
      <ComboboxInputGroup
        className={cn("h-8 min-h-0 py-0", invalid && "border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40")}
      >
        <Search className="size-3.5 shrink-0 text-veltol-faint" />
        <ComboboxInput placeholder={t("subcontractorSearchPlaceholder")} className="text-sm" />
        <ComboboxClear className="ml-auto shrink-0" aria-label={t("subcontractorSearchNone")}>
          <X className="size-3.5" />
        </ComboboxClear>
      </ComboboxInputGroup>
      <ComboboxPortal>
        <ComboboxPositioner>
          <ComboboxPopup>
            <ComboboxEmpty>{t("subcontractorSearchNoResults")}</ComboboxEmpty>
            <ComboboxList>
              {(s: SubcontractorRef) => (
                <ComboboxItem key={s.id} value={s}>
                  <ComboboxItemIndicator />
                  {s.name}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxPopup>
        </ComboboxPositioner>
      </ComboboxPortal>
    </Combobox>
  );
}
