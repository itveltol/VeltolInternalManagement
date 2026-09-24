"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import type { DoubleBookingConflictView, DoubleBookingResolution } from "@/app/[locale]/(app)/schedule/actions";
import type { TeamLookupEntry } from "../services/scheduleService";

type Choice = DoubleBookingResolution["choice"];
/** "collision" = the user said it's not intended but hasn't yet picked where the person goes. */
type Selection = Choice | "collision";

interface Props {
  open: boolean;
  conflicts: DoubleBookingConflictView[];
  isPending?: boolean;
  teamByAssigneeId?: Record<string, TeamLookupEntry>;
  onResolve: (resolutions: DoubleBookingResolution[]) => void;
  onCancel: () => void;
}

/** One question in the dialog: a single person, or a whole team clashing with the same other entry. */
interface ConflictGroup {
  key: string;
  teamName: string | null;
  displayName: string;
  conflicts: DoubleBookingConflictView[];
}

function groupConflicts(conflicts: DoubleBookingConflictView[], teamByAssigneeId: Record<string, TeamLookupEntry> | undefined): ConflictGroup[] {
  const groups = new Map<string, ConflictGroup>();
  for (const c of conflicts) {
    const team = teamByAssigneeId?.[c.subjectKey];
    const key = team ? `team:${team.team_id}:${c.assignmentId}` : `${c.subjectKey}:${c.assignmentId}`;
    const group = groups.get(key);
    if (group) group.conflicts.push(c);
    else groups.set(key, { key, teamName: team?.team_name ?? null, displayName: team?.team_name ?? c.assigneeName, conflicts: [c] });
  }
  return [...groups.values()];
}

export function DoubleBookingDialog({ open, conflicts, isPending = false, teamByAssigneeId, onResolve, onCancel }: Props) {
  const t = useTranslations("schedule");
  const [selections, setSelections] = useState<Record<string, Selection>>({});
  const [seenConflicts, setSeenConflicts] = useState(conflicts);

  // Nothing preselected — reset whenever a fresh set of overlaps comes in, so the user consciously decides each one.
  if (seenConflicts !== conflicts) {
    setSeenConflicts(conflicts);
    setSelections({});
  }

  const groups = useMemo(() => groupConflicts(conflicts, teamByAssigneeId), [conflicts, teamByAssigneeId]);

  const allResolved = groups.every((g) => {
    const s = selections[g.key];
    return s !== undefined && s !== "collision";
  });

  function select(g: ConflictGroup, next: Selection) {
    setSelections((prev) => ({ ...prev, [g.key]: next }));
  }

  function handleConfirm() {
    if (!allResolved) return;
    // The server still resolves per member — fan each group's answer out to all of its conflicts.
    onResolve(
      groups.flatMap((g) =>
        g.conflicts.map((c) => ({
          subjectKey: c.subjectKey,
          assignmentId: c.assignmentId,
          choice: selections[g.key] as Choice,
        })),
      ),
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && !isPending && onCancel()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-[51] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
          <Dialog.Title className="text-xl font-semibold text-veltol-fg">
            {t("doubleBooking.title")}
          </Dialog.Title>
          <p className="mt-2 text-sm text-veltol-fgMute">{t("doubleBooking.description")}</p>

          <div className="mt-4 space-y-4">
            {groups.map((g) => {
              const c = g.conflicts[0];
              const name = g.displayName;
              const selection = selections[g.key];
              const isCollision = selection === "collision" || selection === "keepHere" || selection === "keepOther";
              return (
                <div key={g.key} className="rounded-lg border border-border p-3">
                  <p className="text-sm text-veltol-fg">
                    {g.teamName
                      ? t("doubleBooking.teamConflictLine", {
                          team: g.teamName,
                          count: g.conflicts.length,
                          project: c.projectName,
                          start: c.start_date,
                          end: c.end_date,
                        })
                      : t("doubleBooking.conflictLine", {
                          name: c.assigneeName,
                          project: c.projectName,
                          start: c.start_date,
                          end: c.end_date,
                        })}
                  </p>
                  {g.teamName && (
                    <p className="mt-1 text-[12px] text-veltol-fgMute">{g.conflicts.map((m) => m.assigneeName).join(", ")}</p>
                  )}

                  <p className="mt-3 text-[11px] font-medium text-veltol-fgMute">{t("doubleBooking.intendedQuestion")}</p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    <ChoiceButton selected={selection === "keepBoth"} disabled={isPending} onClick={() => select(g, "keepBoth")}>
                      {t("doubleBooking.intendedYes")}
                    </ChoiceButton>
                    <ChoiceButton selected={isCollision} disabled={isPending} onClick={() => select(g, "collision")}>
                      {t("doubleBooking.intendedNo")}
                    </ChoiceButton>
                  </div>

                  {isCollision && (
                    <>
                      <p className="mt-3 text-[11px] font-medium text-veltol-fgMute">
                        {t("doubleBooking.whereQuestion", { name })}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        <ChoiceButton selected={selection === "keepHere"} disabled={isPending} onClick={() => select(g, "keepHere")}>
                          {t("doubleBooking.keepHere")}
                        </ChoiceButton>
                        <ChoiceButton selected={selection === "keepOther"} disabled={isPending} onClick={() => select(g, "keepOther")}>
                          {t("doubleBooking.keepOther", { project: c.projectName })}
                        </ChoiceButton>
                      </div>
                    </>
                  )}

                  {selection && selection !== "collision" && (
                    <p className="mt-2 text-[12px] text-veltol-fgMute">
                      {selection === "keepHere" && t("doubleBooking.hintKeepHere", { name, project: c.projectName })}
                      {selection === "keepOther" && t("doubleBooking.hintKeepOther", { name })}
                      {selection === "keepBoth" && t("doubleBooking.hintKeepBoth", { name })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" disabled={isPending} onClick={onCancel}>
              {t("cancel")}
            </Button>
            <Button type="button" disabled={isPending || !allResolved} onClick={handleConfirm}>
              {isPending && <Loader2 className="animate-spin" data-icon="inline-start" />}
              {isPending ? t("saving") : t("save")}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ChoiceButton({
  selected,
  disabled,
  onClick,
  children,
}: {
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button type="button" size="sm" variant={selected ? "default" : "outline"} aria-pressed={selected} disabled={disabled} onClick={onClick}>
      {selected && <Check data-icon="inline-start" />}
      {children}
    </Button>
  );
}
