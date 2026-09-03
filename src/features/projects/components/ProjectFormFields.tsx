"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Input } from "@/shared/components/ui/input";
import { CurrencyAmountInput } from "@/shared/components/ui/currency-amount-input";
import { FormField } from "@/shared/components/ui/form-field";
import { FormSection } from "@/shared/components/ui/form-section";
import { Select, SELECT_CLASS } from "@/shared/components/ui/select";
import {
  PROJECT_PHASES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  PROJECT_CATEGORIES,
  CONTRACT_TYPES,
  FINANCIAL_TYPES,
  EXECUTION_MODES,
  ROMANIAN_COUNTIES,
} from "../types";
import type { ContractType } from "../types";
import type { ClientRef } from "@/features/clients/types";
import { ClientCombobox } from "@/features/clients/components/ClientCombobox";
import type { SubcontractorRef } from "@/features/subcontractors/types";
import { SubcontractorCombobox } from "@/features/subcontractors/components/SubcontractorCombobox";
import { AddressCombobox } from "./AddressCombobox";
import type { ProjectFieldsState } from "./projectFormState";
import { cn } from "@/shared/utils/cn";

const LocationPickerMap = dynamic(
  () => import("@/shared/components/ui/location-picker-map").then((m) => m.LocationPickerMap),
  { ssr: false },
);

const TEXTAREA_CLASS =
  "w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-2 font-sans text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20 resize-none aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";

interface CurrencyFieldDefaults {
  amount: number | null;
  currency: "EUR" | "RON";
  rate: number | null;
  onRefreshRate?: () => Promise<number | null>;
  refreshLabel?: string;
}

interface Props {
  fields: ProjectFieldsState;
  onFieldChange: (key: keyof ProjectFieldsState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onCategoryChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onCountyChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  mapFocus: [number, number] | null;
  onExecutionModeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onFinancialTypeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  statusManual: boolean;
  onStatusManualChange: (manual: boolean) => void;
  onSiteLocationChange: (value: string) => void;
  onLocationSelect: (lat: number, lng: number, label: string) => void;
  onMapChange: (lat: number, lng: number) => Promise<void>;

  managers: { id: string; first_name: string | null; last_name: string | null }[];
  contractTypeDefaults?: ContractType[];

  clientRefs: ClientRef[];
  selectedClient: ClientRef | null;
  onClientChange: (client: ClientRef | null) => void;
  /** Add dialog only — Edit has no "quick create client" affordance. */
  onNewClient?: () => void;

  subcontractorRefs: SubcontractorRef[];
  selectedSubcontractor: SubcontractorRef | null;
  onSubcontractorChange: (subcontractor: SubcontractorRef | null) => void;
  onNewSubcontractor: () => void;
  /** Prefill + refresh-rate wiring for the subcontractor price field (edit-mode only). */
  assignmentPriceDefaults?: CurrencyFieldDefaults;

  /** Rate shown for the "≈ converted" preview on the value field when there's no prefill (add-mode). */
  exchangeRate: number | null;
  /** Prefill + refresh-rate wiring for the project value field (edit-mode only). */
  valueDefaults?: CurrencyFieldDefaults;

  defaultPhase?: string;
  defaultStatus?: string;
  defaultAssignmentStartDate?: string;
  defaultAssignmentDeadline?: string;
  progressReadout?: number;

  aiClass?: (key: keyof ProjectFieldsState) => string;
  fieldErrors?: Record<string, string>;
}

/**
 * Field JSX shared by AddProjectDialog and EditProjectDialog — the two
 * dialogs differ only in where field values/defaults come from (blank state
 * vs an existing Project) and in a few dialog-specific extras (AI-fill ring
 * styling, the read-only progress readout) passed as props.
 */
export function ProjectFormFields({
  fields,
  onFieldChange,
  onCategoryChange,
  onCountyChange,
  mapFocus,
  onExecutionModeChange,
  onFinancialTypeChange,
  statusManual,
  onStatusManualChange,
  onSiteLocationChange,
  onLocationSelect,
  onMapChange,
  managers,
  contractTypeDefaults,
  clientRefs,
  selectedClient,
  onClientChange,
  onNewClient,
  subcontractorRefs,
  selectedSubcontractor,
  onSubcontractorChange,
  onNewSubcontractor,
  assignmentPriceDefaults,
  exchangeRate,
  valueDefaults,
  defaultPhase = "planning",
  defaultStatus = "on_schedule",
  defaultAssignmentStartDate,
  defaultAssignmentDeadline,
  progressReadout,
  aiClass = () => "",
  fieldErrors,
}: Props) {
  const t = useTranslations("projects");
  const isInvalid = (key: string) => Boolean(fieldErrors?.[key]);
  const tPhase = useTranslations("projectPhase");
  const tStatus = useTranslations("projectStatus");
  const tType = useTranslations("projectType");
  const tCategory = useTranslations("projectCategory");
  const tContractType = useTranslations("contractType");
  const tFinancialType = useTranslations("financialType");
  const tExecutionMode = useTranslations("executionMode");

  return (
    <>
      <input type="hidden" name="status_manual" value={statusManual ? "true" : "false"} />

      <FormSection title={t("sections.identity")} first>
        <FormField label={t("fields.name")} required>
          <Input
            name="name"
            required
            value={fields.name}
            onChange={onFieldChange("name")}
            className={aiClass("name")}
            aria-invalid={isInvalid("name")}
          />
        </FormField>

        <FormField label={t("fields.executionMode")}>
          <Select name="execution_mode" value={fields.execution_mode} onChange={onExecutionModeChange}>
            {EXECUTION_MODES.map((m) => (
              <option key={m} value={m} className="bg-card">{tExecutionMode(m)}</option>
            ))}
          </Select>
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t("fields.projectCategory")}>
            <Select name="project_category" value={fields.project_category} onChange={onCategoryChange}>
              {PROJECT_CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-card">{tCategory(c)}</option>
              ))}
            </Select>
          </FormField>

          {fields.project_category === "industrial" && (
            <FormField label={t("fields.projectType")} required>
              <Select
                name="project_type"
                value={fields.project_type}
                onChange={onFieldChange("project_type")}
                className={aiClass("project_type")}
                required
                aria-invalid={isInvalid("project_type")}
              >
                <option value="" className="bg-card">—</option>
                {PROJECT_TYPES.map((pt) => (
                  <option key={pt} value={pt} className="bg-card">{tType(pt)}</option>
                ))}
              </Select>
            </FormField>
          )}
        </div>
      </FormSection>

      <FormSection title={t("sections.location")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t("fields.county")} required>
            <Select
              name="county"
              required
              value={fields.county}
              onChange={onCountyChange}
              className={aiClass("county")}
              aria-invalid={isInvalid("county")}
            >
              <option value="" className="bg-card">—</option>
              {ROMANIAN_COUNTIES.map((c) => (
                <option key={c} value={c} className="bg-card">{c}</option>
              ))}
            </Select>
          </FormField>
          <FormField label={t("fields.siteLocation")} required>
            <input type="hidden" name="site_location" value={fields.site_location} />
            <AddressCombobox
              value={fields.site_location}
              onValueChange={onSiteLocationChange}
              onLocationSelect={onLocationSelect}
            />
          </FormField>
        </div>

        <FormField label={t("fields.pinLocation")} required>
          <input type="hidden" name="site_lat" value={fields.site_lat} />
          <input type="hidden" name="site_lng" value={fields.site_lng} />
          <LocationPickerMap
            lat={fields.site_lat ? Number(fields.site_lat) : null}
            lng={fields.site_lng ? Number(fields.site_lng) : null}
            onChange={onMapChange}
            focus={mapFocus}
            className={cn(
              "relative isolate h-56 w-full overflow-hidden rounded-lg border",
              isInvalid("site_lat") || isInvalid("site_lng")
                ? "border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40"
                : "border-border",
            )}
          />
          {(isInvalid("site_lat") || isInvalid("site_lng")) && (
            <p className="text-xs text-destructive">{t("fields.pinLocationRequired")}</p>
          )}
        </FormField>
      </FormSection>

      <FormSection title={t("sections.capacity")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t("fields.mwSolar")} required>
            <Input
              name="mw_solar"
              type="number"
              step="0.001"
              min="0"
              required
              value={fields.mw_solar}
              onChange={onFieldChange("mw_solar")}
              className={aiClass("mw_solar")}
              aria-invalid={isInvalid("mw_solar")}
            />
          </FormField>
          <FormField label={t("fields.mwBess")} required>
            <Input
              name="mw_bess"
              type="number"
              step="0.001"
              min="0"
              required
              value={fields.mw_bess}
              onChange={onFieldChange("mw_bess")}
              className={aiClass("mw_bess")}
              aria-invalid={isInvalid("mw_bess")}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title={t("sections.people")}>
        {fields.execution_mode === "internal" && (
          <FormField label={t("fields.manager")} required>
            <Select
              name="manager_id"
              value={fields.manager_id}
              onChange={onFieldChange("manager_id")}
              required
              aria-invalid={isInvalid("manager_id")}
            >
              <option value="" className="bg-card">—</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id} className="bg-card">
                  {[m.first_name, m.last_name].filter(Boolean).join(" ") || m.id}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        <FormField label={t("fields.sales")}>
          <Select
            name="sales_id"
            value={fields.sales_id}
            onChange={onFieldChange("sales_id")}
          >
            <option value="" className="bg-card">—</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id} className="bg-card">
                {[m.first_name, m.last_name].filter(Boolean).join(" ") || m.id}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t("fields.peopleNeeded")}>
          <Input
            name="people_needed"
            type="number"
            step="1"
            min="0"
            value={fields.people_needed}
            onChange={onFieldChange("people_needed")}
            className={aiClass("people_needed")}
            aria-invalid={isInvalid("people_needed")}
          />
        </FormField>

        <FormField
          required
          label={
            onNewClient ? (
              <div className="flex w-full items-center justify-between">
                <span>{t("fields.client")}</span>
                <button
                  type="button"
                  onClick={onNewClient}
                  className="text-[11px] font-medium text-veltol-accent hover:underline"
                >
                  {t("newClient")}
                </button>
              </div>
            ) : (
              t("fields.client")
            )
          }
        >
          <ClientCombobox
            name="client_id"
            clients={clientRefs}
            value={selectedClient}
            onValueChange={onClientChange}
            aria-invalid={isInvalid("client_id")}
          />
        </FormField>
      </FormSection>

      <FormSection title={t("sections.contractFinancials")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t("fields.financialType")}>
            <Select name="financial_type" value={fields.financial_type} onChange={onFinancialTypeChange}>
              {FINANCIAL_TYPES.map((ft) => (
                <option key={ft} value={ft} className="bg-card">{tFinancialType(ft)}</option>
              ))}
            </Select>
          </FormField>
        </div>

        <FormField label={t("fields.contractType")}>
          <div className="flex gap-6">
            {CONTRACT_TYPES.map((c) => (
              <label key={c} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  name={`contract_type_${c}`}
                  value="true"
                  defaultChecked={contractTypeDefaults ? contractTypeDefaults.includes(c) : true}
                  className="h-4 w-4 rounded border border-border bg-veltol-surface accent-veltol-accent"
                />
                <span className="font-mono text-[11px] text-veltol-fgDim">{tContractType(c)}</span>
              </label>
            ))}
          </div>
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t("fields.contractNumber")} required={fields.execution_mode === "internal"}>
            <Input
              name="contract_number"
              required={fields.execution_mode === "internal"}
              value={fields.contract_number}
              onChange={onFieldChange("contract_number")}
              className={aiClass("contract_number")}
              aria-invalid={isInvalid("contract_number")}
            />
          </FormField>
          <FormField label={t("fields.contractDate")} required={fields.execution_mode === "internal"}>
            <input
              name="contract_date"
              type="date"
              required={fields.execution_mode === "internal"}
              value={fields.contract_date}
              onChange={onFieldChange("contract_date")}
              className={SELECT_CLASS}
              aria-invalid={isInvalid("contract_date")}
            />
          </FormField>
        </div>

        <FormField label={t("fields.value")} required>
          <CurrencyAmountInput
            amountName="value_amount"
            currencyName="currency"
            required
            defaultAmount={valueDefaults?.amount}
            defaultCurrency={valueDefaults?.currency}
            rate={valueDefaults?.rate ?? exchangeRate}
            onRefreshRate={valueDefaults?.onRefreshRate}
            refreshLabel={valueDefaults?.refreshLabel}
          />
        </FormField>
      </FormSection>

      <FormSection title={t("sections.executionStatus")}>
        {fields.execution_mode === "subcontracted" ? (
          <>
            <FormField
              required
              label={
                <div className="flex w-full items-center justify-between">
                  <span>{t("fields.subcontractor")}</span>
                  <button
                    type="button"
                    onClick={onNewSubcontractor}
                    className="text-[11px] font-medium text-veltol-accent hover:underline"
                  >
                    {t("newSubcontractor")}
                  </button>
                </div>
              }
            >
              <SubcontractorCombobox
                name="subcontractor_id"
                subcontractors={subcontractorRefs}
                value={selectedSubcontractor}
                onValueChange={onSubcontractorChange}
                aria-invalid={isInvalid("subcontractor_id")}
              />
            </FormField>

            <FormField label={t("fields.subcontractorPrice")} required>
              <CurrencyAmountInput
                amountName="assignment_price"
                currencyName="assignment_currency"
                required
                defaultAmount={assignmentPriceDefaults?.amount}
                defaultCurrency={assignmentPriceDefaults?.currency}
                rate={assignmentPriceDefaults?.rate ?? exchangeRate}
                onRefreshRate={assignmentPriceDefaults?.onRefreshRate}
                refreshLabel={assignmentPriceDefaults?.refreshLabel}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label={t("fields.subcontractorStartDate")} required>
                <input
                  name="assignment_start_date"
                  type="date"
                  required
                  defaultValue={defaultAssignmentStartDate}
                  className={SELECT_CLASS}
                  aria-invalid={isInvalid("assignment_start_date")}
                />
              </FormField>
              <FormField label={t("fields.subcontractorDeadline")} required>
                <input
                  name="assignment_deadline"
                  type="date"
                  required
                  defaultValue={defaultAssignmentDeadline}
                  className={SELECT_CLASS}
                  aria-invalid={isInvalid("assignment_deadline")}
                />
              </FormField>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label={t("fields.phase")}>
                <Select name="current_phase" defaultValue={defaultPhase}>
                  {PROJECT_PHASES.map((p) => (
                    <option key={p} value={p} className="bg-card">{tPhase(p)}</option>
                  ))}
                </Select>
              </FormField>
              {progressReadout != null && (
                <FormField label={t("fields.progress")}>
                  <div className="flex h-9 items-center px-1 font-mono text-[13px] text-veltol-fg">
                    {progressReadout}%
                  </div>
                </FormField>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label={t("fields.deadline")} required>
                <input
                  name="deadline"
                  type="date"
                  required
                  value={fields.deadline}
                  onChange={onFieldChange("deadline")}
                  className={SELECT_CLASS}
                  aria-invalid={isInvalid("deadline")}
                />
              </FormField>
            </div>

            <FormField
              label={
                <div className="flex w-full items-center justify-between">
                  <span>{t("fields.status")}</span>
                  <label className="flex cursor-pointer items-center gap-1.5" title={t("autoManual.autoHint")}>
                    <input
                      type="checkbox"
                      checked={statusManual}
                      onChange={(e) => onStatusManualChange(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border border-border bg-veltol-surface accent-veltol-accent"
                    />
                    <span className="font-mono text-[10px] text-veltol-fgDim">
                      {statusManual ? t("autoManual.manual") : t("autoManual.auto")}
                    </span>
                  </label>
                </div>
              }
            >
              <Select name="status" defaultValue={defaultStatus} disabled={!statusManual}>
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-card">{tStatus(s)}</option>
                ))}
              </Select>
            </FormField>
          </>
        )}
      </FormSection>

      <FormSection title={t("sections.notes")}>
        <FormField label={t("fields.notes")}>
          <textarea
            name="notes"
            rows={3}
            className={cn(TEXTAREA_CLASS, aiClass("notes"))}
            value={fields.notes}
            onChange={onFieldChange("notes")}
          />
        </FormField>
      </FormSection>
    </>
  );
}
