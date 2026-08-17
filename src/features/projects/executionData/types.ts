export interface ProjectExecutionData {
  project_id: number;
  site_responsible: string | null;
  diriginte_santier: string | null;
  rte: string | null;
  buget_alocat_eur: number | null;
  numar_persoane_alocate: number | null;
  zile_deadline: number | null;
  zile_reale: number | null;
  updated_at: string;
  updated_by: string | null;
}

export interface ProjectStructureConfigRow {
  id: number;
  project_id: number;
  structure_type: string;
  mesa_count: number;
  picior_per_mesa: number | null;
  stalp_per_mesa: number | null;
  grinzi_per_mesa: number | null;
  pane_per_mesa: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface StructureTotals {
  picior: number;
  stalp: number;
  grinzi: number;
  pane: number;
}
