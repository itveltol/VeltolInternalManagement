import type { ContractType, Currency } from "../types";

/** One contract on a project — a project can have several over time (e.g. a
 * proiectare+executie contract signed now, a separate racordare contract
 * signed months later). Each contract owns its own number/date/value/
 * currency/VAT/contract_type[]; within one project a given contract_type can
 * only be claimed by one contract at a time (enforced in the DB by
 * contract_claimed_types). */
export interface Contract {
  id: number;
  project_id: number;
  contract_number: string | null;
  contract_date: string | null;
  value_eur: number | null;
  value_lei: number | null;
  currency: Currency;
  conversion_rate: number | null;
  vat_rate: number;
  contract_type: ContractType[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateContractPayload {
  project_id: number;
  contract_number: string | null;
  contract_date: string | null;
  value_eur: number | null;
  value_lei: number | null;
  currency: Currency;
  conversion_rate: number | null;
  vat_rate: number;
  contract_type: ContractType[];
  notes: string | null;
}

export type UpdateContractPayload = Partial<Omit<CreateContractPayload, "project_id">>;

export interface ContractsApiClient {
  getContractsForProject(projectId: number): Promise<Contract[]>;
  getContractsForProjects(projectIds: number[]): Promise<Contract[]>;
  getContractById(id: number): Promise<Contract | null>;
  /** Every contract's number in the whole system (no project filter) — used
   * only to compute the next-contract-number suggestion (see
   * suggestNextContractNumber), so it fetches just that one column rather
   * than every contract row. */
  getAllContractNumbers(): Promise<{ contract_number: string | null }[]>;
  createContract(payload: CreateContractPayload): Promise<{ id: number }>;
  updateContract(id: number, payload: UpdateContractPayload): Promise<void>;
  deleteContract(id: number): Promise<void>;
}
