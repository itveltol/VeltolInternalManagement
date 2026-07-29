import type { Subcontractor, SubcontractorRef } from "../types";

export interface CreateSubcontractorPayload {
  name: string;
  contact_person: string | null;
  phone: string | null;
  price_eur: number | null;
  price_lei: number | null;
  deadline: string | null;
  notes: string | null;
}

export interface SubcontractorsApiClient {
  getSubcontractors(): Promise<Subcontractor[]>;
  getSubcontractorRefs(): Promise<SubcontractorRef[]>;
  getSubcontractorById(id: number): Promise<Subcontractor | null>;
  createSubcontractor(payload: CreateSubcontractorPayload): Promise<{ id: number }>;
  updateSubcontractor(id: number, payload: CreateSubcontractorPayload): Promise<void>;
  deleteSubcontractor(id: number): Promise<void>;
}
