export type ClientType = "company" | "person";

export const CLIENT_TYPES: ClientType[] = ["company", "person"];

export interface Client {
  id: number;
  type: ClientType;
  name: string;
  // Company-specific
  cui: string | null;
  j_number: string | null;
  legal_rep: string | null;
  // Person-specific
  cnp: string | null;
  id_series: string | null;
  id_number: string | null;
  // Shared
  reg_address: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientRef {
  id: number;
  name: string;
}
