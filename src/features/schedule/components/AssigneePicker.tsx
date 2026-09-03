"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { toast } from "sonner";
import { Loader2, Trash2, X } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import {
  Combobox,
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
  ComboboxClear,
} from "@/shared/components/ui/combobox";
import {
  createAssignmentAction,
  updateAssignmentAction,
  deleteAssignmentAction,
  searchAssigneesAction,
  searchProjectsAction,
  searchProjectManagersAction,
} from "@/app/[locale]/(app)/schedule/actions";
import { AssignmentDayRow } from "./AssignmentDayRow";
import type { ScheduleAssignment, ScheduleAssignee, ScheduleProjectOption } from "../types";
import type { AssignmentMemberInput } from "../api/types";

function toMemberInput(a: ScheduleAssignee): AssignmentMemberInput {
  return a.kind === "worker"
    ? { profile_id: null, team_worker_id: Number(a.id.replace("worker:", "")) }
    : { profile_id: a.id, team_worker_id: null };
}

interface PersonOption {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  assignment: ScheduleAssignment | null;
  /** Seed the date range when creating a new assignment from a specific day column's "+" button. Ignored when editing an existing assignment. */
  initialStartDate?: string;
  initialEndDate?: string;
  /** Pre-select these assignees (still editable/removable, unless lockAssignees is set) when opened from a specific team's row "+" button — saves re-picking that team's dedicated members. Ignored when editing an existing assignment. */
  initialAssignees?: ScheduleAssignee[];
  /** Team rows have a fixed roster — show the assignees read-only instead of an editable combobox. */
  lockAssignees?: boolean;
}

export function AssigneePicker({ open, onClose, assignment, initialStartDate, initialEndDate, initialAssignees, lockAssignees }: Props) {
  const t = useTranslations("schedule");
  const [project, setProject] = useState<ScheduleProjectOption | null>(null);
  const [projectItems, setProjectItems] = useState<ScheduleProjectOption[]>([]);
  const [pm, setPm] = useState<PersonOption | null>(null);
  const [sales, setSales] = useState<PersonOption | null>(null);
  const [pmItems, setPmItems] = useState<PersonOption[]>([]);
  const [salesItems, setSalesItems] = useState<PersonOption[]>([]);
  const [assignees, setAssignees] = useState<ScheduleAssignee[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [label, setLabel] = useState("");
  const [items, setItems] = useState<ScheduleAssignee[]>([]);
  const [isSearching, startSearch] = useTransition();
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const projectDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pmDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const salesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    setProject(null);
    setPm(assignment?.pm ?? null);
    setSales(assignment?.sales ?? null);
    setAssignees(assignment?.assignees ?? initialAssignees ?? []);
    setStartDate(assignment?.start_date ?? initialStartDate ?? "");
    setEndDate(assignment?.end_date ?? initialEndDate ?? "");
    setLabel(assignment?.label ?? "");
    startSearch(async () => setItems(await searchAssigneesAction("")));
    startSearch(async () => setProjectItems(await searchProjectsAction("")));
    startSearch(async () => {
      const managers = await searchProjectManagersAction("");
      setPmItems(managers);
      setSalesItems(managers);
    });
  }, [open, assignment, initialStartDate, initialEndDate, initialAssignees]);

  function handleInputValueChange(query: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startSearch(async () => setItems(await searchAssigneesAction(query)));
    }, 250);
  }

  function handleProjectInputValueChange(query: string) {
    if (projectDebounceRef.current) clearTimeout(projectDebounceRef.current);
    projectDebounceRef.current = setTimeout(() => {
      startSearch(async () => setProjectItems(await searchProjectsAction(query)));
    }, 250);
  }

  function handlePmInputValueChange(query: string) {
    if (pmDebounceRef.current) clearTimeout(pmDebounceRef.current);
    pmDebounceRef.current = setTimeout(() => {
      startSearch(async () => setPmItems(await searchProjectManagersAction(query)));
    }, 250);
  }

  function handleSalesInputValueChange(query: string) {
    if (salesDebounceRef.current) clearTimeout(salesDebounceRef.current);
    salesDebounceRef.current = setTimeout(() => {
      startSearch(async () => setSalesItems(await searchProjectManagersAction(query)));
    }, 250);
  }

  function handleProjectChange(next: ScheduleProjectOption | null) {
    const previous = project;
    setProject(next);
    if (!next) return;
    // Prefill PM/sales from the picked project — but don't clobber a value the
    // user deliberately chose that differs from the previously selected project's own.
    if (!pm || pm.id === previous?.manager?.id) setPm(next.manager);
    if (!sales || sales.id === previous?.sales?.id) setSales(next.sales);
  }

  const resolvedProjectId = project?.id ?? null;
  const canSave = assignees.length > 0 && !!startDate && !!endDate && (!!resolvedProjectId || !!label.trim());

  function handleSave() {
    if (!canSave) return;
    startTransition(async () => {
      const members = assignees.map(toMemberInput);
      const shared = {
        project_id: resolvedProjectId,
        pm_id: pm?.id ?? null,
        sales_id: sales?.id ?? null,
        start_date: startDate,
        end_date: endDate,
        label: label.trim(),
        // Card color is now derived from the PM at display time — no longer user-picked.
        color: null,
      };

      const result = assignment
        ? await updateAssignmentAction(assignment.id, members, shared)
        : await createAssignmentAction({ ...shared, members });

      if (result?.error) {
        toast.error(t(result.error as "errorGeneric" | "errorNotAllowed" | "errorProjectOrLabelRequired"));
        return;
      }
      if (result?.warning) {
        toast.warning(
          t("entry.vacationConflict", {
            start: result.warning.conflictStart,
            end: result.warning.conflictEnd,
          }),
        );
      } else if (result?.success) {
        toast.success(t(result.success as "entrySaved"));
      }
      onClose();
    });
  }

  function handleDelete() {
    if (!assignment) return;
    startTransition(async () => {
      const result = await deleteAssignmentAction(assignment.id);
      if (result?.error) toast.error(t(result.error as "errorGeneric" | "errorNotAllowed"));
      else {
        if (result?.success) toast.success(t(result.success as "entryDeleted"));
        onClose();
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
          <Dialog.Title className="text-xl font-semibold text-veltol-fg">
            {assignment ? t("entry.editTitle") : t("entry.addTitle")}
          </Dialog.Title>

          <div className="mt-6 space-y-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-veltol-fgMute">{t("entry.project")}</span>
              <Combobox
                items={projectItems}
                value={project}
                onValueChange={handleProjectChange}
                onInputValueChange={handleProjectInputValueChange}
                itemToStringLabel={(p: ScheduleProjectOption) => p.name}
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
                        {(p: ScheduleProjectOption) => (
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

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-veltol-fgMute">{t("entry.pm")}</span>
                <Combobox
                  items={pmItems}
                  value={pm}
                  onValueChange={setPm}
                  onInputValueChange={handlePmInputValueChange}
                  itemToStringLabel={(p: PersonOption) => p.name}
                >
                  <ComboboxInputGroup>
                    <ComboboxValue />
                    <ComboboxInput placeholder={t("entry.pmPlaceholder")} />
                    <ComboboxClear />
                  </ComboboxInputGroup>
                  <ComboboxPortal>
                    <ComboboxPositioner>
                      <ComboboxPopup>
                        <ComboboxEmpty>
                          {isSearching ? t("entry.searching") : t("entry.noAssignees")}
                        </ComboboxEmpty>
                        <ComboboxList>
                          {(p: PersonOption) => (
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

              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-veltol-fgMute">{t("entry.sales")}</span>
                <Combobox
                  items={salesItems}
                  value={sales}
                  onValueChange={setSales}
                  onInputValueChange={handleSalesInputValueChange}
                  itemToStringLabel={(p: PersonOption) => p.name}
                >
                  <ComboboxInputGroup>
                    <ComboboxValue />
                    <ComboboxInput placeholder={t("entry.salesPlaceholder")} />
                    <ComboboxClear />
                  </ComboboxInputGroup>
                  <ComboboxPortal>
                    <ComboboxPositioner>
                      <ComboboxPopup>
                        <ComboboxEmpty>
                          {isSearching ? t("entry.searching") : t("entry.noAssignees")}
                        </ComboboxEmpty>
                        <ComboboxList>
                          {(p: PersonOption) => (
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
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-veltol-fgMute">{t("entry.assignee")}</span>
              {!lockAssignees && (
                <Combobox
                  items={items}
                  value={assignees}
                  onValueChange={setAssignees}
                  onInputValueChange={handleInputValueChange}
                  itemToStringLabel={(a: ScheduleAssignee) => a.name}
                  multiple
                >
                  <ComboboxInputGroup>
                    <ComboboxInput placeholder={t("entry.assigneePlaceholder")} />
                  </ComboboxInputGroup>
                  <ComboboxPortal>
                    <ComboboxPositioner>
                      <ComboboxPopup>
                        <ComboboxEmpty>
                          {isSearching ? t("entry.searching") : t("entry.noAssignees")}
                        </ComboboxEmpty>
                        <ComboboxList>
                          {(a: ScheduleAssignee) => (
                            <ComboboxItem key={a.id} value={a}>
                              <ComboboxItemIndicator />
                              {a.name}
                              {a.kind === "worker" && (
                                <span className="text-veltol-fgMute"> {t("roster.workerTag")}</span>
                              )}
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxPopup>
                    </ComboboxPositioner>
                  </ComboboxPortal>
                </Combobox>
              )}

              {/* Selected assignees, listed vertically with full names for readability. */}
              <div className="flex flex-col divide-y divide-border rounded-md border border-border bg-veltol-surface/60">
                {assignees.length === 0 ? (
                  <span className="px-2.5 py-1.5 text-[12px] text-veltol-fgMute">{t("entry.noAssignments")}</span>
                ) : (
                  assignees.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                      <span className="text-[13px] text-veltol-fg">{a.name}</span>
                      {!lockAssignees && (
                        <button
                          type="button"
                          onClick={() => setAssignees((prev) => prev.filter((x) => x.id !== a.id))}
                          aria-label={t("entry.removeAssignee", { name: a.name })}
                          className="shrink-0 rounded p-0.5 text-veltol-fgMute transition-colors hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
              {lockAssignees && (
                <p className="text-[11px] text-veltol-fgMute">{t("entry.assigneesLockedHint")}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("entry.startDate")}</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("entry.endDate")}</Label>
                <Input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            {assignment && assignment.days.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-veltol-fgMute">{t("entry.delegationHours")}</span>
                <div className="space-y-1.5">
                  {assignment.days.map((day) => (
                    <AssignmentDayRow key={day.work_date} assignmentId={assignment.id} day={day} canMutate />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("entry.label")}</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t("entry.labelPlaceholder")}
              />
              {!resolvedProjectId && !label.trim() && (
                <p className="text-[11px] text-veltol-fgMute">{t("entry.projectOrLabelHint")}</p>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              {assignment ? (
                <Button type="button" variant="destructive" disabled={isPending} onClick={handleDelete}>
                  {isPending ? <Loader2 className="animate-spin" /> : <Trash2 data-icon="inline-start" />}
                  {t("entry.delete")}
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-3">
                <Dialog.Close render={<Button type="button" variant="outline">{t("cancel")}</Button>} />
                <Button type="button" disabled={isPending || !canSave} onClick={handleSave}>
                  {isPending ? t("saving") : t("save")}
                </Button>
              </div>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
