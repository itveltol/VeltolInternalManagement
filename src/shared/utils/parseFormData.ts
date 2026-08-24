import type { z } from "zod";

/**
 * Parses raw FormData against a zod schema, returning a discriminated result
 * so callers can surface a translation-key error through the existing
 * ActionState shape without throwing.
 */
type ParseFormDataResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors: Record<string, string> };

export function parseFormData<S extends z.ZodType>(
  schema: S,
  formData: FormData,
): ParseFormDataResult<z.infer<S>> {
  const raw = Object.fromEntries(formData.entries());
  const result = schema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= "invalid";
    }
    return { success: false, error: "errorValidation", fieldErrors };
  }
  return { success: true, data: result.data };
}
