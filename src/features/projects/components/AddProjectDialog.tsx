"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Input } from "@/shared/components/ui/input";
import { CurrencyAmountInput } from "@/shared/components/ui/currency-amount-input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { AiFillButton } from "@/shared/components/ui/ai-fill-button";
import { useAiFormFill } from "@/shared/hooks/useAiFormFill";
import { createProject, reverseGeocode } from "@/app/[locale]/(app)/projects/actions";
import {
  PROJECT_PHASES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  PROJECT_CATEGORIES,
  CONTRACT_TYPES,
  FINANCIAL_TYPES,
  EXECUTION_MODES,
} from "../types";
import type { ProjectManager, ProjectCategory, FinancialType, ExecutionMode } from "../types";
import type { ClientRef } from "@/features/clients/types";
import { AddClientDialog } from "@/features/clients/components/AddClientDialog";
import { ClientCombobox } from "@/features/clients/components/ClientCombobox";
import type { SubcontractorRef } from "@/features/subcontractors/types";
import { AddSubcontractorDialog } from "@/features/subcontractors/components/AddSubcontractorDialog";
import { SubcontractorCombobox } from "@/features/subcontractors/components/SubcontractorCombobox";
import { FolderScanStep } from "./FolderScanStep";
import { AddressCombobox } from "./AddressCombobox";
import { cn } from "@/shared/utils/cn";

const LocationPickerMap = dynamic(
  () => import("@/shared/components/ui/location-picker-map").then((m) => m.LocationPickerMap),
  { ssr: false },
);

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-1 font-mono text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20";

const TEXTAREA_CLASS =
  "w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-2 font-sans text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20 resize-none";

interface ProjectFields {
  name: string;
  county: string;
  site_location: string;
  site_lat: string;
  site_lng: string;
  project_category: ProjectCategory;
  financial_type: FinancialType;
  project_type: string;
  contract_number: string;
  mw_solar: string;
  mw_bess: string;
  notes: string;
}

const EMPTY: ProjectFields = {
  name: "",
  county: "",
  site_location: "",
  site_lat: "",
  site_lng: "",
  project_category: "industrial",
  financial_type: "proprii",
  project_type: "",
  contract_number: "",
  mw_solar: "",
  mw_bess: "",
  notes: "",
};

const AI_TARGET_FIELDS: (keyof ProjectFields)[] = [
  "name",
  "county",
  "site_location",
  "project_type",
  "contract_number",
  "mw_solar",
  "mw_bess",
  "notes",
];

interface Props {
  open: boolean;
  managers: ProjectManager[];
  clientRefs: ClientRef[];
  subcontractorRefs: SubcontractorRef[];
  exchangeRate: number | null;
  onClose: () => void;
}

export function AddProjectDialog({ open, managers, clientRefs, subcontractorRefs, exchangeRate, onClose }: Props) {
  const t = useTranslations("projects");
  const tPhase = useTranslations("projectPhase");
  const tStatus = useTranslations("projectStatus");
  const tType = useTranslations("projectType");
  const tCategory = useTranslations("projectCategory");
  const tContractType = useTranslations("contractType");
  const tFinancialType = useTranslations("financialType");
  const tExecutionMode = useTranslations("executionMode");

  const [state, action, pending] = useActionState(createProject, null);
  const [step, setStep] = useState<"form" | "scan">("form");
  const [createdProjectId, setCreatedProjectId] = useState<number | null>(null);
  const [folderLinked, setFolderLinked] = useState(false);

  const [fields, setFields] = useState<ProjectFields>(EMPTY);
  const [snapshot, setSnapshot] = useState<ProjectFields | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientRef | null>(null);
  const [localClientRefs, setLocalClientRefs] = useState<ClientRef[]>(clientRefs);
  const [showAddClient, setShowAddClient] = useState(false);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("internal");
  const [statusManual, setStatusManual] = useState(false);
  const [selectedSubcontractor, setSelectedSubcontractor] = useState<SubcontractorRef | null>(null);
  const [localSubcontractorRefs, setLocalSubcontractorRefs] = useState<SubcontractorRef[]>(subcontractorRefs);
  const [showAddSubcontractor, setShowAddSubcontractor] = useState(false);

  useEffect(() => {
    setLocalClientRefs(clientRefs);
  }, [clientRefs]);

  useEffect(() => {
    setLocalSubcontractorRefs(subcontractorRefs);
  }, [subcontractorRefs]);

  const getContext = useCallback(() => ({ name: fields.name }), [fields.name]);

  const { fillWithAi, loading, hasSuggestions, reset } = useAiFormFill({
    formType: "project",
    getContext,
    targetFields: AI_TARGET_FIELDS,
  });

  useEffect(() => {
    if (state?.success && state.projectId) {
      setCreatedProjectId(state.projectId);
      setFolderLinked(state.folderCreated !== false);
      setStep("scan");
    }
  }, [state?.success, state?.projectId]);

  useEffect(() => {
    if (!open) {
      setFields(EMPTY);
      setSnapshot(null);
      setStep("form");
      setCreatedProjectId(null);
      setSelectedClient(null);
      setExecutionMode("internal");
      setSelectedSubcontractor(null);
      reset();
    }
  }, [open]);

  const setField = useCallback(
    (key: keyof ProjectFields) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setFields((f) => ({ ...f, [key]: e.target.value })),
    [],
  );

  const handleCategoryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const project_category = e.target.value as ProjectCategory;
      setFields((f) => ({
        ...f,
        project_category,
        project_type: project_category === "residential" ? "" : f.project_type,
      }));
    },
    [],
  );

  const handleFill = async () => {
    setSnapshot({ ...fields });
    const suggestions = await fillWithAi();
    if (Object.keys(suggestions).length > 0) {
      setFields((f) => ({ ...f, ...(suggestions as Partial<ProjectFields>) }));
    }
  };

  const handleFileSelect = async (file: File) => {
    setSnapshot({ ...fields });
    const suggestions = await fillWithAi(file);
    if (Object.keys(suggestions).length > 0) {
      setFields((f) => ({ ...f, ...(suggestions as Partial<ProjectFields>) }));
    }
  };

  const handleUndo = () => {
    if (snapshot) {
      setFields(snapshot);
      setSnapshot(null);
      reset();
    }
  };

  const handleMapChange = useCallback(async (lat: number, lng: number) => {
    setFields((f) => ({ ...f, site_lat: String(lat), site_lng: String(lng) }));
    const address = await reverseGeocode(lat, lng);
    if (address) {
      setFields((f) => ({ ...f, site_location: address }));
    }
  }, []);

  const aiClass = (key: keyof ProjectFields) =>
    cn(hasSuggestions && fields[key] ? "ring-1 ring-veltol-accent/30" : "");

  return (
    <>
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
          {step === "scan" && createdProjectId !== null ? (
            <>
              <Dialog.Title className="text-xl font-semibold text-veltol-fg">
                {t("folderScan.stepTitle")}
              </Dialog.Title>
              <div className="mt-6">
                <FolderScanStep
                  projectId={createdProjectId}
                  folderLinked={folderLinked}
                  onClose={onClose}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-xl font-semibold text-veltol-fg">
                  {t("addProject")}
                </Dialog.Title>
                <AiFillButton
                  onFill={handleFill}
                  onFileSelect={handleFileSelect}
                  onUndo={handleUndo}
                  loading={loading}
                  hasSuggestions={hasSuggestions}
                />
              </div>

              <form action={action} className="mt-6 space-y-4">
                <input type="hidden" name="status_manual" value={statusManual ? "true" : "false"} />
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.name")} *</Label>
                  <Input
                    name="name"
                    required
                    value={fields.name}
                    onChange={setField("name")}
                    className={aiClass("name")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.executionMode")}</Label>
                  <select
                    name="execution_mode"
                    value={executionMode}
                    onChange={(e) => setExecutionMode(e.target.value as ExecutionMode)}
                    className={SELECT_CLASS}
                  >
                    {EXECUTION_MODES.map((m) => (
                      <option key={m} value={m} className="bg-card">{tExecutionMode(m)}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.county")}</Label>
                    <Input
                      name="county"
                      value={fields.county}
                      onChange={setField("county")}
                      className={aiClass("county")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.siteLocation")}</Label>
                    <input type="hidden" name="site_location" value={fields.site_location} />
                    <AddressCombobox
                      value={fields.site_location}
                      onValueChange={(v) => setFields((f) => ({ ...f, site_location: v }))}
                      onLocationSelect={(lat, lng, label) =>
                        setFields((f) => ({
                          ...f,
                          site_location: label,
                          site_lat: String(lat),
                          site_lng: String(lng),
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.pinLocation")}</Label>
                  <input type="hidden" name="site_lat" value={fields.site_lat} />
                  <input type="hidden" name="site_lng" value={fields.site_lng} />
                  <LocationPickerMap
                    lat={fields.site_lat ? Number(fields.site_lat) : null}
                    lng={fields.site_lng ? Number(fields.site_lng) : null}
                    onChange={handleMapChange}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.mwSolar")}</Label>
                    <Input
                      name="mw_solar"
                      type="number"
                      step="0.001"
                      min="0"
                      value={fields.mw_solar}
                      onChange={setField("mw_solar")}
                      className={aiClass("mw_solar")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.mwBess")}</Label>
                    <Input
                      name="mw_bess"
                      type="number"
                      step="0.001"
                      min="0"
                      value={fields.mw_bess}
                      onChange={setField("mw_bess")}
                      className={aiClass("mw_bess")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.projectCategory")}</Label>
                    <select
                      name="project_category"
                      value={fields.project_category}
                      onChange={handleCategoryChange}
                      className={SELECT_CLASS}
                    >
                      {PROJECT_CATEGORIES.map((c) => (
                        <option key={c} value={c} className="bg-card">{tCategory(c)}</option>
                      ))}
                    </select>
                  </div>
                  {executionMode === "internal" && (
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.manager")}</Label>
                      <select name="manager_id" className={SELECT_CLASS}>
                        <option value="" className="bg-card">—</option>
                        {managers.map((m) => (
                          <option key={m.id} value={m.id} className="bg-card">
                            {[m.first_name, m.last_name].filter(Boolean).join(" ") || m.id}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.financialType")}</Label>
                    <select
                      name="financial_type"
                      value={fields.financial_type}
                      onChange={(e) =>
                        setFields((f) => ({ ...f, financial_type: e.target.value as FinancialType }))
                      }
                      className={SELECT_CLASS}
                    >
                      {FINANCIAL_TYPES.map((ft) => (
                        <option key={ft} value={ft} className="bg-card">{tFinancialType(ft)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.contractType")}</Label>
                  <div className="flex gap-6">
                    {CONTRACT_TYPES.map((c) => (
                      <label key={c} className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          name={`contract_type_${c}`}
                          value="true"
                          defaultChecked
                          className="h-4 w-4 rounded border border-border bg-veltol-surface accent-veltol-accent"
                        />
                        <span className="font-mono text-[11px] text-veltol-fgDim">{tContractType(c)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {fields.project_category === "industrial" && (
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.projectType")}</Label>
                    <select
                      name="project_type"
                      value={fields.project_type}
                      onChange={(e) => setFields((f) => ({ ...f, project_type: e.target.value }))}
                      className={cn(SELECT_CLASS, aiClass("project_type"))}
                    >
                      <option value="" className="bg-card">—</option>
                      {PROJECT_TYPES.map((pt) => (
                        <option key={pt} value={pt} className="bg-card">{tType(pt)}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.client")}</Label>
                    <button
                      type="button"
                      onClick={() => setShowAddClient(true)}
                      className="text-[11px] font-medium text-veltol-accent hover:underline"
                    >
                      {t("newClient")}
                    </button>
                  </div>
                  <ClientCombobox
                    name="client_id"
                    clients={localClientRefs}
                    value={selectedClient}
                    onValueChange={setSelectedClient}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.contractNumber")}</Label>
                    <Input
                      name="contract_number"
                      value={fields.contract_number}
                      onChange={setField("contract_number")}
                      className={aiClass("contract_number")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.contractDate")}</Label>
                    <input name="contract_date" type="date" className={SELECT_CLASS} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.value")}</Label>
                  <CurrencyAmountInput
                    amountName="value_amount"
                    currencyName="currency"
                    rate={exchangeRate}
                  />
                </div>

                {executionMode === "subcontracted" ? (
                  <>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.subcontractor")}</Label>
                        <button
                          type="button"
                          onClick={() => setShowAddSubcontractor(true)}
                          className="text-[11px] font-medium text-veltol-accent hover:underline"
                        >
                          {t("newSubcontractor")}
                        </button>
                      </div>
                      <SubcontractorCombobox
                        name="subcontractor_id"
                        subcontractors={localSubcontractorRefs}
                        value={selectedSubcontractor}
                        onValueChange={setSelectedSubcontractor}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.subcontractorPrice")}</Label>
                      <CurrencyAmountInput
                        amountName="assignment_price"
                        currencyName="assignment_currency"
                        rate={exchangeRate}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.subcontractorStartDate")}</Label>
                        <input name="assignment_start_date" type="date" className={SELECT_CLASS} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.subcontractorDeadline")}</Label>
                        <input name="assignment_deadline" type="date" className={SELECT_CLASS} />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.phase")}</Label>
                      <select name="current_phase" defaultValue="planning" className={SELECT_CLASS}>
                        {PROJECT_PHASES.map((p) => (
                          <option key={p} value={p} className="bg-card">{tPhase(p)}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.deadline")}</Label>
                        <input name="deadline" type="date" className={SELECT_CLASS} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.status")}</Label>
                        <label className="flex cursor-pointer items-center gap-1.5" title={t("autoManual.autoHint")}>
                          <input
                            type="checkbox"
                            checked={statusManual}
                            onChange={(e) => setStatusManual(e.target.checked)}
                            className="h-3.5 w-3.5 rounded border border-border bg-veltol-surface accent-veltol-accent"
                          />
                          <span className="font-mono text-[10px] text-veltol-fgDim">
                            {statusManual ? t("autoManual.manual") : t("autoManual.auto")}
                          </span>
                        </label>
                      </div>
                      <select name="status" defaultValue="on_schedule" className={SELECT_CLASS} disabled={!statusManual}>
                        {PROJECT_STATUSES.map((s) => (
                          <option key={s} value={s} className="bg-card">{tStatus(s)}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.notes")}</Label>
                  <textarea
                    name="notes"
                    rows={3}
                    className={cn(TEXTAREA_CLASS, aiClass("notes"))}
                    value={fields.notes}
                    onChange={setField("notes")}
                  />
                </div>

                {state?.error && <p className="text-sm text-veltol-red">{t(state.error as Parameters<typeof t>[0])}</p>}
                {state?.success && state.folderCreated === false && (
                  <p className="text-sm text-veltol-orange">{t("folderFailed")}</p>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Dialog.Close render={<Button type="button" variant="outline">{t("cancel")}</Button>} />
                  <Button type="submit" disabled={pending}>{pending ? t("saving") : t("save")}</Button>
                </div>
              </form>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>

    <AddClientDialog
      open={showAddClient}
      onClose={() => setShowAddClient(false)}
      onCreated={(client) => {
        setLocalClientRefs((refs) =>
          [...refs, client].sort((a, b) => a.name.localeCompare(b.name)),
        );
        setSelectedClient(client);
      }}
    />

    <AddSubcontractorDialog
      open={showAddSubcontractor}
      onClose={() => setShowAddSubcontractor(false)}
      onCreated={(subcontractor) => {
        setLocalSubcontractorRefs((refs) =>
          [...refs, subcontractor].sort((a, b) => a.name.localeCompare(b.name)),
        );
        setSelectedSubcontractor(subcontractor);
      }}
    />
    </>
  );
}
