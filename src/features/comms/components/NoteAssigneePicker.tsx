"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
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

interface AssigneeOption {
  id: string;
  name: string;
}

interface Props {
  options: AssigneeOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  invalid?: boolean;
}

export function NoteAssigneePicker({ options, selectedIds, onChange, invalid }: Props) {
  const t = useTranslations("comms");
  const filter = useComboboxFilter({ multiple: true });

  const selected = useMemo(() => options.filter((o) => selectedIds.includes(o.id)), [options, selectedIds]);

  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(next) => onChange(next.map((o) => o.id))}
      itemToStringLabel={(o: AssigneeOption) => o.name}
      filter={filter.contains}
      multiple
    >
      <div className="flex flex-col gap-2">
        <ComboboxValue>
          {(value: AssigneeOption[]) =>
            value.length > 0 && (
              <ComboboxChips>
                {value.map((o) => (
                  <ComboboxChip key={o.id} aria-label={o.name}>
                    {o.name}
                    <ComboboxChipRemove aria-label={t("fields.assigneeRemove", { name: o.name })} />
                  </ComboboxChip>
                ))}
              </ComboboxChips>
            )
          }
        </ComboboxValue>
        <ComboboxInputGroup>
          <ComboboxInput placeholder={t("fields.selectAssignee")} aria-invalid={invalid || undefined} />
        </ComboboxInputGroup>
      </div>
      <ComboboxPortal>
        <ComboboxPositioner>
          <ComboboxPopup>
            <ComboboxEmpty>{t("fields.assigneeNoResults")}</ComboboxEmpty>
            <ComboboxList>
              {(o: AssigneeOption) => (
                <ComboboxItem key={o.id} value={o}>
                  <ComboboxItemIndicator />
                  {o.name}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxPopup>
        </ComboboxPositioner>
      </ComboboxPortal>
    </Combobox>
  );
}
