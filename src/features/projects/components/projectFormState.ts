import { useCallback, useMemo, useState } from "react";
import { reverseGeocode } from "@/app/[locale]/(app)/projects/actions";
import { ROMANIAN_COUNTY_COORDS } from "../types";
import type { Project, ProjectCategory, FinancialType, ExecutionMode } from "../types";

export interface ProjectFieldsState {
  name: string;
  county: string;
  site_location: string;
  site_lat: string;
  site_lng: string;
  project_category: ProjectCategory;
  financial_type: FinancialType;
  project_type: string;
  execution_mode: ExecutionMode;
  status_manual: boolean;
  contract_number: string;
  mw_solar: string;
  mw_bess: string;
  notes: string;
  manager_id: string;
  contract_date: string;
  deadline: string;
}

const EMPTY_FIELDS: ProjectFieldsState = {
  name: "",
  county: "",
  site_location: "",
  site_lat: "",
  site_lng: "",
  project_category: "industrial",
  financial_type: "proprii",
  project_type: "",
  execution_mode: "internal",
  status_manual: false,
  contract_number: "",
  mw_solar: "",
  mw_bess: "",
  notes: "",
  manager_id: "",
  contract_date: "",
  deadline: "",
};

function fieldsFromProject(project: Project): ProjectFieldsState {
  return {
    name: project.name,
    county: project.county ?? "",
    site_location: project.site_location ?? "",
    site_lat: project.site_lat != null ? String(project.site_lat) : "",
    site_lng: project.site_lng != null ? String(project.site_lng) : "",
    project_category: project.project_category,
    financial_type: project.financial_type,
    project_type: project.project_type ?? "",
    execution_mode: project.execution_mode,
    status_manual: project.status_manual,
    contract_number: project.contract_number ?? "",
    mw_solar: project.mw_solar != null ? String(project.mw_solar) : "",
    mw_bess: project.mw_bess != null ? String(project.mw_bess) : "",
    notes: project.notes ?? "",
    manager_id: project.manager_id ?? "",
    contract_date: project.contract_date ?? "",
    deadline: project.deadline ?? "",
  };
}

/**
 * Owns every plain-value project form field as a single object, so both
 * AddProjectDialog and EditProjectDialog re-render only their form subtree
 * on keystroke instead of the previous mismatch (Add used one object, Edit
 * used ~10 separate useState calls).
 */
export function useProjectFormState(project?: Project) {
  const [fields, setFields] = useState<ProjectFieldsState>(
    project ? fieldsFromProject(project) : EMPTY_FIELDS,
  );

  const setField = useCallback(
    (key: keyof ProjectFieldsState) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setFields((f) => ({ ...f, [key]: e.target.value })),
    [],
  );

  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const project_category = e.target.value as ProjectCategory;
    setFields((f) => ({
      ...f,
      project_category,
      project_type: project_category === "residential" ? "" : f.project_type,
    }));
  }, []);

  const handleCountyChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const county = e.target.value;
    setFields((f) =>
      f.county === county
        ? f
        : { ...f, county, site_location: "", site_lat: "", site_lng: "" },
    );
  }, []);

  const mapFocus = useMemo(
    () => (ROMANIAN_COUNTY_COORDS as Record<string, [number, number]>)[fields.county] ?? null,
    [fields.county],
  );

  const handleExecutionModeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFields((f) => ({ ...f, execution_mode: e.target.value as ExecutionMode }));
  }, []);

  const handleFinancialTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFields((f) => ({ ...f, financial_type: e.target.value as FinancialType }));
  }, []);

  const setStatusManual = useCallback((statusManual: boolean) => {
    setFields((f) => ({ ...f, status_manual: statusManual }));
  }, []);

  const setSiteLocation = useCallback((site_location: string) => {
    setFields((f) => ({ ...f, site_location }));
  }, []);

  const setLocationSelect = useCallback((lat: number, lng: number, label: string) => {
    setFields((f) => ({ ...f, site_location: label, site_lat: String(lat), site_lng: String(lng) }));
  }, []);

  const handleMapChange = useCallback(async (lat: number, lng: number) => {
    setFields((f) => ({ ...f, site_lat: String(lat), site_lng: String(lng) }));
    const address = await reverseGeocode(lat, lng);
    if (address) {
      setFields((f) => ({ ...f, site_location: address }));
    }
  }, []);

  return {
    fields,
    setFields,
    setField,
    handleCategoryChange,
    handleCountyChange,
    mapFocus,
    handleExecutionModeChange,
    handleFinancialTypeChange,
    setStatusManual,
    setSiteLocation,
    setLocationSelect,
    handleMapChange,
  };
}

export { EMPTY_FIELDS };
