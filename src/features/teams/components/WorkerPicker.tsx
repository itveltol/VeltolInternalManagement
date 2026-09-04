"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
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
import type { TeamWorker } from "../types";

function workerLabel(w: TeamWorker): string {
  return `${w.first_name} ${w.last_name ?? ""}`.trim();
}

interface Props {
  pickableWorkers: TeamWorker[];
  allTeams: { id: number; name: string }[];
  onSelect: (workerId: number) => void;
}

export function WorkerPicker({ pickableWorkers, allTeams, onSelect }: Props) {
  const t = useTranslations("teams");
  const filter = useComboboxFilter();
  const teamNameById = useMemo(() => new Map(allTeams.map((team) => [team.id, team.name])), [allTeams]);

  if (pickableWorkers.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-veltol-fgMute">{t("workerPicker.label")}</span>
        <span className="text-sm text-veltol-fgMute">{t("workerPicker.empty")}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-veltol-fgMute">{t("workerPicker.label")}</span>
      <Combobox
        items={pickableWorkers}
        value={null}
        onValueChange={(worker: TeamWorker | null) => worker && onSelect(worker.id)}
        itemToStringLabel={workerLabel}
        filter={filter.contains}
      >
        <ComboboxInputGroup>
          <ComboboxInput placeholder={t("workerPicker.placeholder")} />
        </ComboboxInputGroup>
        <ComboboxPortal>
          <ComboboxPositioner>
            <ComboboxPopup>
              <ComboboxEmpty>{t("workerPicker.noResults")}</ComboboxEmpty>
              <ComboboxList>
                {(w: TeamWorker) => (
                  <ComboboxItem key={w.id} value={w}>
                    <ComboboxItemIndicator />
                    <div className="flex flex-col">
                      <span>{workerLabel(w)}</span>
                      {w.team_id !== null && (
                        <span className="font-mono text-[9px] opacity-60">
                          {teamNameById.get(w.team_id) ?? ""}
                        </span>
                      )}
                    </div>
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
