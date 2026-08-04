import type { ExchangeRate } from "../types";

export interface ExchangeRatesApiClient {
  getRateByDate(date: string): Promise<ExchangeRate | null>;
  getLatestRate(): Promise<ExchangeRate | null>;
  upsertRate(rate: ExchangeRate): Promise<void>;
}
