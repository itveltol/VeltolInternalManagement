"use client";

import { useState } from "react";
import { ClientsTable } from "./ClientsTable";
import type { Client, ClientType } from "../types";

interface Props {
  clients: Client[];
  canMutate: boolean;
}

export function ClientsShell({ clients, canMutate }: Props) {
  const [filterType, setFilterType] = useState<ClientType | "">("");

  const filtered = clients.filter((c) => {
    if (filterType && c.type !== filterType) return false;
    return true;
  });

  return (
    <ClientsTable
      clients={filtered}
      canMutate={canMutate}
      filterType={filterType}
      onFilterType={setFilterType}
    />
  );
}
