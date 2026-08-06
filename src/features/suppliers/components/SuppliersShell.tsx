"use client";

import { SuppliersTable } from "./SuppliersTable";
import type { Supplier } from "../types";

interface Props {
  suppliers: Supplier[];
  canMutate: boolean;
}

export function SuppliersShell({ suppliers, canMutate }: Props) {
  return <SuppliersTable suppliers={suppliers} canMutate={canMutate} />;
}
