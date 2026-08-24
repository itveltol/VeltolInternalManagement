"use server";

import { z } from "zod";
import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseSuppliersClient } from "@/features/suppliers/api/supabaseSuppliersClient";
import * as supplierService from "@/features/suppliers/services/supplierService";
import type { Supplier, SupplierRef } from "@/features/suppliers/types";
import { parseFormData } from "@/shared/utils/parseFormData";

export type ActionState =
  | { error?: string; success?: string; supplier?: { id: number; name: string }; fieldErrors?: Record<string, string> }
  | null;

const optionalTrimmed = () =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
    z.string().nullable(),
  );

const supplierSchema = z.object({
  name: z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().min(1)),
  cui: optionalTrimmed(),
  reg_com: optionalTrimmed(),
  contact_person: optionalTrimmed(),
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
    z.email().nullable(),
  ),
  phone: optionalTrimmed(),
  address: optionalTrimmed(),
  iban: optionalTrimmed(),
  notes: optionalTrimmed(),
});

async function getSuppliersPath() {
  const locale = await getLocale();
  return `/${locale}/suppliers`;
}

async function requireAuth() {
  const { supabase, user } = await getSessionUser();
  if (!user) throw new Error("Unauthenticated");
  return { supabase, user };
}

async function requireMutator() {
  const { supabase, user, role } = await getUserProfileRole();
  if (!user) throw new Error("Unauthenticated");
  if (!["admin", "project_manager"].includes(role ?? "")) {
    throw new Error("Forbidden");
  }
  return { supabase, user };
}

export async function getSuppliers(): Promise<Supplier[]> {
  const { supabase } = await requireAuth();
  const api = createSupabaseSuppliersClient(supabase);
  return supplierService.getSuppliers(api);
}

export async function getSupplierRefs(): Promise<SupplierRef[]> {
  const { supabase } = await requireAuth();
  const api = createSupabaseSuppliersClient(supabase);
  return supplierService.getSupplierRefs(api);
}

export async function createSupplierAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const parsed = parseFormData(supplierSchema, formData);
    if (!parsed.success) return { error: parsed.error, fieldErrors: parsed.fieldErrors };
    const api = createSupabaseSuppliersClient(supabase);
    const result = await supplierService.createSupplier(api, parsed.data);
    revalidatePath(await getSuppliersPath());
    return { success: "supplierCreated", supplier: { id: result.id, name: parsed.data.name } };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function updateSupplierAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const parsed = parseFormData(supplierSchema, formData);
    if (!parsed.success) return { error: parsed.error, fieldErrors: parsed.fieldErrors };
    const api = createSupabaseSuppliersClient(supabase);
    const supplierId = Number(formData.get("supplierId"));
    await supplierService.updateSupplier(api, supplierId, parsed.data);
    revalidatePath(await getSuppliersPath());
    return { success: "supplierSaved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function deleteSupplierAction(id: number): Promise<ActionState> {
  try {
    const { supabase, role } = await getUserProfileRole();
    if (role !== "admin") return { error: "errorNotAllowed" };
    const api = createSupabaseSuppliersClient(supabase);
    await supplierService.deleteSupplier(api, id);
    revalidatePath(await getSuppliersPath());
    return { success: "supplierDeleted" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "HasReferences") return { error: "errorHasReferences" };
    return { error: "errorGeneric" };
  }
}
