export type ProjectPhase =
  | "planning"
  | "permitting"
  | "construction"
  | "warranty"
  | "closed"
  | "cancelled";

export type ProjectStatus =
  | "on_schedule"
  | "delayed"
  | "critical"
  | "completed"
  | "on_hold";

export type ProjectCategory = "residential" | "industrial";

export type FinancialType = "proprii" | "finantare";

export type ContractType = "proiectare" | "executie" | "mentenanta" | "racordare";

export type ExecutionMode = "internal" | "subcontracted";

export type Currency = "EUR" | "RON";

export interface Project {
  id: number;
  name: string;
  county: string | null;
  site_location: string | null;
  site_lat: number | null;
  site_lng: number | null;
  mw_solar: number | null;
  mw_bess: number | null;
  project_category: ProjectCategory;
  financial_type: FinancialType;
  project_type: string | null;
  contract_type: ContractType[];
  manager_id: string | null;
  manager?: { first_name: string | null; last_name: string | null } | null;
  sales_id: string | null;
  sales?: { first_name: string | null; last_name: string | null } | null;
  client_id: number | null;
  client?: { id: number; name: string } | null;
  people_needed: number | null;
  execution_mode: ExecutionMode;
  /** Id of the project's current project_subcontractors assignment row, if any. */
  subcontractor_assignment_id: number | null;
  subcontractor?: {
    id: number;
    name: string;
    contact_person: string | null;
    phone: string | null;
    price_eur: number | null;
    price_lei: number | null;
    /** Which of price_eur/price_lei was actually entered; the other is derived from conversion_rate. */
    currency: Currency;
    /** EUR->RON rate on the day this assignment was created; locked in permanently, never recomputed. */
    conversion_rate: number | null;
    start_date: string | null;
    deadline: string | null;
  } | null;
  current_phase: ProjectPhase;
  progress_pct: number;
  contract_number: string | null;
  contract_date: string | null;
  deadline: string | null;
  value_eur: number | null;
  value_lei: number | null;
  /** Which of value_eur/value_lei was actually entered; the other is derived from conversion_rate. */
  currency: Currency;
  /** EUR->RON rate on the day this project was created; locked in permanently, never recomputed. */
  conversion_rate: number | null;
  /** Percent VAT for this contract's centralizer figures; net values (value_eur/value_lei, situations, budget lines) are unaffected. Default 21; 0 allowed for reverse charge/export. */
  vat_rate: number;
  status: ProjectStatus;
  /** When false, `status` is recomputed from Matrice/checklist progress on the next relevant change. */
  status_manual: boolean;
  notes: string | null;
  paid_by: string | null;
  onedrive_folder_id: string | null;
  onedrive_folder_url: string | null;
  planning_start_date: string | null;
  planning_end_date: string | null;
  execution_start_date: string | null;
  execution_end_date: string | null;
  autorizare_start_date: string | null;
  autorizare_end_date: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  updated_by_user?: { first_name: string | null; last_name: string | null } | null;
}

export interface ProjectManager {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

export const PROJECT_PHASES: ProjectPhase[] = [
  "planning",
  "permitting",
  "construction",
  "warranty",
  "closed",
  "cancelled",
];

export const PROJECT_STATUSES: ProjectStatus[] = [
  "on_schedule",
  "delayed",
  "critical",
  "completed",
  "on_hold",
];

export const PROJECT_CATEGORIES: ProjectCategory[] = ["residential", "industrial"];

export const ROMANIAN_COUNTIES = [
  "Alba",
  "Arad",
  "Argeș",
  "Bacău",
  "Bihor",
  "Bistrița-Năsăud",
  "Botoșani",
  "Brașov",
  "Brăila",
  "București",
  "Buzău",
  "Caraș-Severin",
  "Călărași",
  "Cluj",
  "Constanța",
  "Covasna",
  "Dâmbovița",
  "Dolj",
  "Galați",
  "Giurgiu",
  "Gorj",
  "Harghita",
  "Hunedoara",
  "Ialomița",
  "Iași",
  "Ilfov",
  "Maramureș",
  "Mehedinți",
  "Mureș",
  "Neamț",
  "Olt",
  "Prahova",
  "Satu Mare",
  "Sălaj",
  "Sibiu",
  "Suceava",
  "Teleorman",
  "Timiș",
  "Tulcea",
  "Vaslui",
  "Vâlcea",
  "Vrancea",
] as const;

// Approximate coordinates of each county seat (reședință de județ), used to
// pan/zoom the site map to the right area once a county is picked, before
// the user places the exact site pin.
export const ROMANIAN_COUNTY_COORDS: Record<(typeof ROMANIAN_COUNTIES)[number], [number, number]> = {
  "Alba": [46.0697, 23.5804],
  "Arad": [46.1866, 21.3123],
  "Argeș": [44.8565, 24.8692],
  "Bacău": [46.5670, 26.9146],
  "Bihor": [47.0722, 21.9217],
  "Bistrița-Năsăud": [47.1333, 24.5000],
  "Botoșani": [47.7486, 26.6694],
  "Brașov": [45.6580, 25.6012],
  "Brăila": [45.2692, 27.9575],
  "București": [44.4268, 26.1025],
  "Buzău": [45.1500, 26.8167],
  "Caraș-Severin": [45.3000, 21.8833],
  "Călărași": [44.2058, 27.3306],
  "Cluj": [46.7712, 23.6236],
  "Constanța": [44.1733, 28.6383],
  "Covasna": [45.8500, 26.1833],
  "Dâmbovița": [44.9333, 25.4500],
  "Dolj": [44.3167, 23.8000],
  "Galați": [45.4353, 28.0080],
  "Giurgiu": [43.9037, 25.9699],
  "Gorj": [45.0333, 23.2833],
  "Harghita": [46.3597, 25.8017],
  "Hunedoara": [45.7500, 22.9000],
  "Ialomița": [44.5667, 27.3833],
  "Iași": [47.1585, 27.6014],
  "Ilfov": [44.5000, 26.1000],
  "Maramureș": [47.6567, 23.5808],
  "Mehedinți": [44.6333, 22.6500],
  "Mureș": [46.5425, 24.5575],
  "Neamț": [46.9333, 26.3667],
  "Olt": [44.4333, 24.3667],
  "Prahova": [44.9333, 26.0333],
  "Satu Mare": [47.7920, 22.8850],
  "Sălaj": [47.1833, 23.0500],
  "Sibiu": [45.7983, 24.1256],
  "Suceava": [47.6514, 26.2556],
  "Teleorman": [43.9000, 25.3333],
  "Timiș": [45.7489, 21.2087],
  "Tulcea": [45.1833, 28.8000],
  "Vaslui": [46.6333, 27.7333],
  "Vâlcea": [45.1000, 24.3667],
  "Vrancea": [45.7000, 27.1833],
};

export const FINANCIAL_TYPES: FinancialType[] = ["proprii", "finantare"];

export const CONTRACT_TYPES: ContractType[] = ["proiectare", "executie", "mentenanta", "racordare"];

export const EXECUTION_MODES: ExecutionMode[] = ["internal", "subcontracted"];

export type ProjectType =
  | "CEF"
  | "CEF+BESS"
  | "BESS"
  | "BESS_CEF"
  | "EMS"
  | "SCADA";

export const PROJECT_TYPES: ProjectType[] = [
  "CEF",
  "CEF+BESS",
  "BESS",
  "BESS_CEF",
  "EMS",
  "SCADA",
];

/** Project types that include a BESS (battery) scope of work — single
 * source of truth for BESS-conditional gating (checklist rows, Matrice
 * auto-N/A). Do not duplicate this list elsewhere. */
export const BESS_PROJECT_TYPES: ProjectType[] = ["CEF+BESS", "BESS", "BESS_CEF"];

export function isBessProjectType(type: string | null | undefined): boolean {
  return type != null && (BESS_PROJECT_TYPES as string[]).includes(type);
}

/** Project types that include a CEF (PV plant) scope of work — single
 * source of truth for CEF-conditional gating (e.g. the "Date intrare CEF"
 * section). Do not duplicate this list elsewhere. */
export const CEF_PROJECT_TYPES: ProjectType[] = ["CEF", "CEF+BESS", "BESS_CEF"];

export function isCefProjectType(type: string | null | undefined): boolean {
  return type != null && (CEF_PROJECT_TYPES as string[]).includes(type);
}
