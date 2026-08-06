export interface Supplier {
  id: number;
  name: string;
  cui: string | null;
  reg_com: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  iban: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierRef {
  id: number;
  name: string;
}
