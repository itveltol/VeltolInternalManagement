export type SearchResultType = "project" | "client" | "document";

export interface ProjectResult {
    type: "project";
    id: number;
    name: string;
    county: string | null;
    contract_number: string | null;
    status: string;
    current_phase: string;
}

export interface ClientResult {
    type: "client";
    id: number;
    name: string;
    cui: string | null;
    contact_person: string | null;
    client_type: string;
}

export interface DocumentResult {
    type: "document";
    id: number;
    name: string;
    url: string;
    linked_type: string;
    project?: {id: number; name: string} | null;
}

export type SearchResult = ProjectResult | ClientResult | DocumentResult;

export interface SearchResults {
    projects: ProjectResult[];
    clients: ClientResult[];
    documents: DocumentResult[];
}