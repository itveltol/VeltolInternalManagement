"use client";

import { ClientsTable } from "./ClientsTable";
import type { Client } from "../types";

interface Props {
  clients: Client[];
  canMutate: boolean;
}

export function ClientsShell({ clients, canMutate }: Props) {
  return <ClientsTable clients={clients} canMutate={canMutate} />;
}
