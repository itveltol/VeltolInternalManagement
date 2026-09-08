import { parseContractNumber } from "@/shared/utils/contractNumber";
import { formatDate } from "@/shared/utils/formatDate";
import type { Contract, ContractsApiClient, CreateContractPayload, UpdateContractPayload } from "./types";

export function getContractsForProject(client: ContractsApiClient, projectId: number): Promise<Contract[]> {
  return client.getContractsForProject(projectId);
}

export function getContractsForProjects(client: ContractsApiClient, projectIds: number[]): Promise<Contract[]> {
  return client.getContractsForProjects(projectIds);
}

export function getContractById(client: ContractsApiClient, id: number): Promise<Contract | null> {
  return client.getContractById(id);
}

export function getAllContractNumbers(client: ContractsApiClient): Promise<{ contract_number: string | null }[]> {
  return client.getAllContractNumbers();
}

export function createContract(client: ContractsApiClient, payload: CreateContractPayload): Promise<{ id: number }> {
  return client.createContract(payload);
}

export function updateContract(client: ContractsApiClient, id: number, payload: UpdateContractPayload): Promise<void> {
  return client.updateContract(id, payload);
}

export function deleteContract(client: ContractsApiClient, id: number): Promise<void> {
  return client.deleteContract(id);
}

/** contract_number is free text with no DB-enforced format, so this is only a
 * suggestion: the highest numeric prefix among existing contract numbers,
 * plus one, formatted as "N/DD.MM.YYYY" with today's date (the "." separator
 * avoids colliding with the "/" between the number and the date). Unparseable
 * contract numbers are ignored rather than breaking the suggestion. The
 * result is pre-filled into an editable input, never written to the DB
 * directly. Moved here from projectService.ts now that contract_number lives
 * on contracts, not projects. */
export function suggestNextContractNumber(contracts: { contract_number: string | null }[]): string {
  const max = contracts.reduce((acc, c) => {
    const n = parseContractNumber(c.contract_number);
    return n !== null && n > acc ? n : acc;
  }, 0);
  return `${max + 1}/${formatDate(new Date())}`;
}
