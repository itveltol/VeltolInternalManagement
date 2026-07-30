import type { Subcontractor, SubcontractorRef, SubcontractorWithProjects, ProjectSubcontractorAssignment } from "../types";

export interface CreateSubcontractorPayload {
  name: string;
  contact_person: string | null;
  phone: string | null;
  notes: string | null;
}

export interface UpsertAssignmentPayload {
  subcontractor_id: number;
  price_eur: number | null;
  price_lei: number | null;
  start_date: string | null;
  deadline: string | null;
  notes: string | null;
}

export interface SubcontractorsApiClient {
  getSubcontractors(): Promise<SubcontractorWithProjects[]>;
  getSubcontractorRefs(): Promise<SubcontractorRef[]>;
  getSubcontractorById(id: number): Promise<Subcontractor | null>;
  createSubcontractor(payload: CreateSubcontractorPayload): Promise<{ id: number }>;
  updateSubcontractor(id: number, payload: CreateSubcontractorPayload): Promise<void>;
  deleteSubcontractor(id: number): Promise<void>;
  getCurrentAssignment(projectId: number): Promise<ProjectSubcontractorAssignment | null>;
  upsertCurrentAssignment(projectId: number, payload: UpsertAssignmentPayload): Promise<void>;
}
