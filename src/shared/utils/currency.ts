export type Currency = "EUR" | "RON";

export function formatCurrency(value: number | null, unit: "EUR" | "lei"): string {
  if (value == null) return "—";
  return `${new Intl.NumberFormat("hu-HU").format(Math.round(value))} ${unit}`;
}

/** Converts an amount between EUR and RON using a given EUR→RON rate
 * (e.g. today's BNR reference rate). Returns null if either input is null,
 * so callers can fall back to an em dash instead of showing "NaN". */
export function convertCurrency(
  value: number | null,
  from: Currency,
  to: Currency,
  eurRonRate: number | null,
): number | null {
  if (value == null || eurRonRate == null) return null;
  if (from === to) return value;
  return from === "EUR" ? value * eurRonRate : value / eurRonRate;
}

/** Renders the live-converted equivalent of a source-currency amount, e.g.
 * "≈ 12,345 Lei". Used alongside the entered value wherever prices are
 * shown, so the other currency is always visible without a second manual field. */
export function formatConvertedCurrency(
  value: number | null,
  sourceCurrency: Currency,
  eurRonRate: number | null,
): string {
  const targetCurrency: Currency = sourceCurrency === "EUR" ? "RON" : "EUR";
  const converted = convertCurrency(value, sourceCurrency, targetCurrency, eurRonRate);
  if (converted == null) return "—";
  const unit = targetCurrency === "RON" ? "lei" : "EUR";
  return `≈ ${formatCurrency(converted, unit)}`;
}
