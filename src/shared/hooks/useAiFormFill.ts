"use client";

import { useState, useCallback, useRef } from "react";
import { useLocale } from "next-intl";

export type FormType = "client" | "project";

export interface AiFillConfig {
  formType: FormType;
  getContext: () => Record<string, string>;
  targetFields: string[];
}

export interface UseAiFormFillReturn {
  fillWithAi: (file?: File) => Promise<Record<string, string>>;
  loading: boolean;
  error: string | null;
  hasSuggestions: boolean;
  reset: () => void;
}

export function useAiFormFill(config: AiFillConfig): UseAiFormFillReturn {
  const locale = useLocale() as "en" | "hu" | "ro";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSuggestions, setHasSuggestions] = useState(false);
  const inflightRef = useRef(false);

  const fillWithAi = useCallback(
    async (file?: File): Promise<Record<string, string>> => {
      if (inflightRef.current) return {};
      inflightRef.current = true;
      setLoading(true);
      setError(null);

      try {
        let res: Response;

        if (file) {
          const fd = new FormData();
          fd.append("formType", config.formType);
          fd.append("context", JSON.stringify(config.getContext()));
          fd.append("targetFields", JSON.stringify(config.targetFields));
          fd.append("locale", locale);
          fd.append("file", file);

          res = await fetch("/api/ai/fill", {
            method: "POST",
            headers: { "x-veltol-ai": "1" },
            body: fd,
          });
        } else {
          res = await fetch("/api/ai/fill", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-veltol-ai": "1",
            },
            body: JSON.stringify({
              formType: config.formType,
              context: config.getContext(),
              targetFields: config.targetFields,
              locale,
            }),
          });
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
        }

        const data = await res.json() as { suggestions?: Record<string, string> };
        const suggestions = data.suggestions ?? {};
        if (Object.keys(suggestions).length > 0) {
          setHasSuggestions(true);
        }
        return suggestions;
      } catch (err) {
        setError(err instanceof Error ? err.message : "AI fill failed");
        return {};
      } finally {
        setLoading(false);
        inflightRef.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.formType, config.targetFields, locale],
  );

  const reset = useCallback(() => {
    setHasSuggestions(false);
    setError(null);
  }, []);

  return { fillWithAi, loading, error, hasSuggestions, reset };
}
