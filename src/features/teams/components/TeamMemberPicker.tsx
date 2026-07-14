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

export interface ProfileRef {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: string;
}

function profileLabel(p: ProfileRef): string {
  const name = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
  return name || p.email;
}

interface Props {
  allProfiles: ProfileRef[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function TeamMemberPicker({ allProfiles, selectedIds, onChange }: Props) {
  const t = useTranslations("teams");
  const filter = useComboboxFilter({ multiple: true });

  const selected = useMemo(
    () => allProfiles.filter((p) => selectedIds.includes(p.id)),
    [allProfiles, selectedIds],
  );

  if (allProfiles.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-veltol-fgMute">{t("memberPicker.label")}</span>
        <span className="text-sm text-veltol-fgMute">{t("memberPicker.empty")}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-veltol-fgMute">{t("memberPicker.label")}</span>
      <Combobox
        items={allProfiles}
        value={selected}
        onValueChange={(next) => onChange(next.map((p) => p.id))}
        itemToStringLabel={profileLabel}
        filter={filter.contains}
        multiple
      >
        <div className="flex flex-col gap-2">
          <ComboboxValue>
            {(value: ProfileRef[]) =>
              value.length > 0 && (
                <ComboboxChips>
                  {value.map((p) => (
                    <ComboboxChip key={p.id} aria-label={profileLabel(p)}>
                      {profileLabel(p)}
                      <ComboboxChipRemove aria-label={t("memberPicker.remove", { name: profileLabel(p) })} />
                    </ComboboxChip>
                  ))}
                </ComboboxChips>
              )
            }
          </ComboboxValue>
          <ComboboxInputGroup>
            <ComboboxInput placeholder={t("memberPicker.placeholder")} />
          </ComboboxInputGroup>
        </div>
        <ComboboxPortal>
          <ComboboxPositioner>
            <ComboboxPopup>
              <ComboboxEmpty>{t("memberPicker.noResults")}</ComboboxEmpty>
              <ComboboxList>
                {(p: ProfileRef) => (
                  <ComboboxItem key={p.id} value={p}>
                    <ComboboxItemIndicator />
                    {profileLabel(p)}
                    <span className="ml-1.5 font-mono text-[9px] opacity-60">{p.email}</span>
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
