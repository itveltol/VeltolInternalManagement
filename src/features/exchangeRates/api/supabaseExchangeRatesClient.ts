import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExchangeRatesApiClient } from "./types";
import type { ExchangeRate } from "../types";

type ExchangeRateRow = {
  rate_date: string;
  eur_ron: number;
};

function toExchangeRate(row: ExchangeRateRow): ExchangeRate {
  return { rateDate: row.rate_date, eurRon: row.eur_ron };
}

export function createSupabaseExchangeRatesClient(supabase: SupabaseClient): ExchangeRatesApiClient {
  return {
    async getRateByDate(date) {
      const { data, error } = await supabase
        .from("exchange_rates")
        .select("rate_date, eur_ron")
        .eq("rate_date", date)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? toExchangeRate(data as ExchangeRateRow) : null;
    },

    async getLatestRate() {
      const { data, error } = await supabase
        .from("exchange_rates")
        .select("rate_date, eur_ron")
        .order("rate_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? toExchangeRate(data as ExchangeRateRow) : null;
    },

    async upsertRate(rate) {
      const { error } = await supabase
        .from("exchange_rates")
        .upsert({ rate_date: rate.rateDate, eur_ron: rate.eurRon }, { onConflict: "rate_date" });
      if (error) throw new Error(error.message);
    },
  };
}
