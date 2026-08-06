import type { Supplier, SupplierRef } from "../types";

export interface SupplierPayload {
  name: string;
  cui: string | null;
  reg_com: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  iban: string | null;
  notes: string | null;
}

export interface SuppliersApiClient {
  getSuppliers(): Promise<Supplier[]>;
  getSupplierRefs(): Promise<SupplierRef[]>;
  getSupplierById(id: number): Promise<Supplier | null>;
  createSupplier(payload: SupplierPayload): Promise<{ id: number }>;
  updateSupplier(id: number, payload: SupplierPayload): Promise<void>;
  deleteSupplier(id: number): Promise<void>;
}
