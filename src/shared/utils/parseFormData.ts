import type { z } from "zod";

/**
 * Parses raw FormData against a zod schema, returning a discriminated result
 * so callers can surface a translation-key error through the existing
 * ActionState shape without throwing.
 */
type ParseFormDataResult<T> = { success: true; data: T } | { success: false; error: string };

export function parseFormData<S extends z.ZodType>(
  schema: S,
  formData: FormData,
): ParseFormDataResult<z.infer<S>> {
  const raw = Object.fromEntries(formData.entries());
  const result = schema.safeParse(raw);
  if (!result.success) return { success: false, error: "errorValidation" };
  return { success: true, data: result.data };
}
