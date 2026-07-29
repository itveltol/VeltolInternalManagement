"use client";

import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import type { ClientRef } from "../types";
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
  clients: ClientRef[];
  value: ClientRef | null;
  onValueChange: (client: ClientRef | null) => void;
  name?: string;
}

export function ClientCombobox({ clients, value, onValueChange, name }: Props) {
  const t = useTranslations("projects");
  const filter = useComboboxFilter({ multiple: false });

  return (
    <Combobox
      items={clients}
      value={value}
      onValueChange={(next: ClientRef | null) => onValueChange(next)}
      itemToStringLabel={(c) => c?.name ?? ""}
      itemToStringValue={(c) => (c ? String(c.id) : "")}
      filter={filter.contains}
      name={name}
    >
      <ComboboxInputGroup className="h-8 min-h-0 py-0">
        <Search className="size-3.5 shrink-0 text-veltol-faint" />
        <ComboboxInput placeholder={t("clientSearchPlaceholder")} className="text-sm" />
        <ComboboxClear className="ml-auto shrink-0" aria-label={t("clientSearchNone")}>
          <X className="size-3.5" />
        </ComboboxClear>
      </ComboboxInputGroup>
      <ComboboxPortal>
        <ComboboxPositioner>
          <ComboboxPopup>
            <ComboboxEmpty>{t("clientSearchNoResults")}</ComboboxEmpty>
            <ComboboxList>
              {(c: ClientRef) => (
                <ComboboxItem key={c.id} value={c}>
                  <ComboboxItemIndicator />
                  {c.name}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxPopup>
        </ComboboxPositioner>
      </ComboboxPortal>
    </Combobox>
  );
}
