export interface ProjectCefData {
  project_id: number;
  putere_instalata: number | null;
  putere_debitata: number | null;
  tip_panou: string | null;
  tip_invertor: string | null;
  tip_structura: string | null;
  tip_gard: string | null;
  ridicare_topo: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface ProjectBessData {
  project_id: number;
  putere_instalata: number | null;
  putere_descarcare: number | null;
  incarcare_din_retea: boolean | null;
  tip_bess: string | null;
  tip_pcs: string | null;
  ridicare_topo: string | null;
  detalii_trafo: string | null;
  updated_at: string;
  updated_by: string | null;
}
