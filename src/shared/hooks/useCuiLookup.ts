"use client";

import { useCallback, useRef, useState } from "react";
import type { AnafCompanyInfo } from "@/features/clients/services/anafService";

export interface UseCuiLookupReturn {
  lookupCui: (cui: string) => Promise<AnafCompanyInfo | null>;
  loading: boolean;
}

export function useCuiLookup(): UseCuiLookupReturn {
  const [loading, setLoading] = useState(false);
  const inflightRef = useRef(false);

  const lookupCui = useCallback(async (cui: string): Promise<AnafCompanyInfo | null> => {
    if (inflightRef.current) return null;
    inflightRef.current = true;
    setLoading(true);

    try {
      const res = await fetch("/api/clients/cui-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cui }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      return (data as { company: AnafCompanyInfo }).company;
    } finally {
      setLoading(false);
      inflightRef.current = false;
    }
  }, []);

  return { lookupCui, loading };
}
