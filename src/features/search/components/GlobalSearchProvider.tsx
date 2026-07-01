"use client";

import { useGlobalSearchShortcut } from "../hooks/useGlobalSearchShortcut";
import { GlobalSearchDialog } from "./GlobalSearchDialog";

export function GlobalSearchProvider() {
  useGlobalSearchShortcut();
  return <GlobalSearchDialog />;
}
