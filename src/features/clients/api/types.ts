import type { Client, ClientRef } from "../types";

export interface CreateClientPayload {
  type: string;
  name: string;
  cui: string | null;
  j_number: string | null;
  legal_rep: string | null;
  cnp: string | null;
  id_series: string | null;
  id_number: string | null;
  reg_address: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

export interface ClientsApiClient {
  getClients(): Promise<Client[]>;
  getClientRefs(): Promise<ClientRef[]>;
  getClientById(id: number): Promise<Client | null>;
  createClient(payload: CreateClientPayload): Promise<{ id: number }>;
  updateClient(id: number, payload: CreateClientPayload): Promise<void>;
  deleteClient(id: number): Promise<void>;
}
