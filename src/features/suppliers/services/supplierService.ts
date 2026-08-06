import type { SuppliersApiClient, SupplierPayload } from "../api/types";
import type { Supplier, SupplierRef } from "../types";

export async function getSuppliers(api: SuppliersApiClient): Promise<Supplier[]> {
  return api.getSuppliers();
}

export async function getSupplierRefs(api: SuppliersApiClient): Promise<SupplierRef[]> {
  return api.getSupplierRefs();
}

export async function getSupplierById(api: SuppliersApiClient, id: number): Promise<Supplier | null> {
  return api.getSupplierById(id);
}

export async function createSupplier(api: SuppliersApiClient, payload: SupplierPayload): Promise<{ id: number }> {
  return api.createSupplier(payload);
}

export async function updateSupplier(api: SuppliersApiClient, id: number, payload: SupplierPayload): Promise<void> {
  return api.updateSupplier(id, payload);
}

export async function deleteSupplier(api: SuppliersApiClient, id: number): Promise<void> {
  return api.deleteSupplier(id);
}
