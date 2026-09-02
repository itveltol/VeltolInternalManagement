"use client";

import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { formatConvertedCurrency, type Currency } from "@/shared/utils/currency";

const SELECT_CLASS =
  "h-8 w-24 rounded-lg border border-border bg-veltol-surface/60 px-2 py-1 font-mono text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20";

interface Props {
  amountName: string;
  currencyName: string;
  defaultAmount?: number | null;
  defaultCurrency?: Currency;
  /** Rate used for the "≈ converted" preview and, on submit, the rate that
   * gets locked in. Pass today's live rate when creating a new record; pass
   * the record's own stored conversion_rate when editing an existing one,
   * so the preview reflects the rate that's actually locked in, not today's. */
  rate: number | null;
  /** When set, shows a "refresh to today's rate" button next to the preview
   * — used in edit forms, where conversion_rate is otherwise frozen and never
   * recomputed. Calling it fetches today's rate for an immediate preview and
   * flags the submission to overwrite the locked-in rate with it. */
  onRefreshRate?: () => Promise<number | null>;
  refreshLabel?: string;
  /** Shown when onRefreshRate resolves to null or throws (e.g. the exchange
   * rate feed is unreachable and no cached rate exists yet). */
  refreshErrorLabel?: string;
  required?: boolean;
  "aria-invalid"?: boolean;
}

/** Single amount input + EUR/RON currency select, with a live "≈ converted"
 * preview below it — the pair this app now uses everywhere a price used to
 * be two separate manually-entered fields. */
export function CurrencyAmountInput({
  amountName,
  currencyName,
  defaultAmount,
  defaultCurrency = "EUR",
  rate,
  onRefreshRate,
  refreshLabel,
  refreshErrorLabel,
  required,
  "aria-invalid": invalid,
}: Props) {
  const [amount, setAmount] = useState<string>(defaultAmount != null ? String(defaultAmount) : "");
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [effectiveRate, setEffectiveRate] = useState<number | null>(rate);
  const [rateRefreshed, setRateRefreshed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);

  const numericAmount = amount.trim() !== "" ? Number(amount) : null;

  async function handleRefresh() {
    if (!onRefreshRate || refreshing) return;
    setRefreshing(true);
    setRefreshError(false);
    try {
      const todaysRate = await onRefreshRate();
      if (todaysRate != null) {
        setEffectiveRate(todaysRate);
        setRateRefreshed(true);
      } else {
        setRefreshError(true);
      }
    } catch (e) {
      console.error("Failed to refresh exchange rate", e);
      setRefreshError(true);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Input
          name={amountName}
          type="number"
          min="0"
          required={required}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1"
          aria-invalid={invalid}
        />
        <select
          name={currencyName}
          value={currency}
          onChange={(e) => setCurrency(e.target.value as Currency)}
          className={SELECT_CLASS}
        >
          <option value="EUR" className="bg-card">EUR</option>
          <option value="RON" className="bg-card">RON</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <div className="font-mono text-[11px] text-veltol-fgMute">
          {formatConvertedCurrency(numericAmount, currency, effectiveRate)}
          {rateRefreshed && <span className="ml-1 text-veltol-accent">({refreshLabel ?? "updated"})</span>}
        </div>
        {onRefreshRate && (
          <>
            <input type="hidden" name={`${amountName}_refresh_rate`} value={rateRefreshed ? "true" : "false"} />
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              title={refreshLabel}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] text-veltol-fgMute transition-colors hover:text-veltol-accent disabled:opacity-50"
            >
              {refreshing ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
            </button>
          </>
        )}
      </div>
      {refreshError && refreshErrorLabel && (
        <p className="font-mono text-[11px] text-veltol-red">{refreshErrorLabel}</p>
      )}
    </div>
  );
}
