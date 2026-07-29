export interface Subcontractor {
  id: number;
  name: string;
  contact_person: string | null;
  phone: string | null;
  price_eur: number | null;
  price_lei: number | null;
  deadline: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubcontractorRef {
  id: number;
  name: string;
}
