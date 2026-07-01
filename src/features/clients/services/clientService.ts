import type { ClientsApiClient, CreateClientPayload } from "../api/types";
import type { Client, ClientRef } from "../types";

export async function getClients(api: ClientsApiClient): Promise<Client[]> {
  return api.getClients();
}

export async function getClientRefs(api: ClientsApiClient): Promise<ClientRef[]> {
  return api.getClientRefs();
}

export async function getClientById(api: ClientsApiClient, id: number): Promise<Client | null> {
  return api.getClientById(id);
}

export async function createClient(api: ClientsApiClient, payload: CreateClientPayload): Promise<{ id: number }> {
  return api.createClient(payload);
}

export async function updateClient(api: ClientsApiClient, id: number, payload: CreateClientPayload): Promise<void> {
  return api.updateClient(id, payload);
}

export async function deleteClient(api: ClientsApiClient, id: number): Promise<void> {
  return api.deleteClient(id);
}
