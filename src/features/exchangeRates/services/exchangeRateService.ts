import type { ExchangeRatesApiClient } from "../api/types";
import type { ExchangeRate } from "../types";

const BNR_FEED_URL = "https://www.bnr.ro/nbrfxrates.xml";

/** BNR publishes one rate per Romanian business day — key cache lookups by
 * the Romanian calendar date, not the server's local date, so the cache
 * doesn't roll over at the wrong instant for a server running in another zone. */
function todayInRomania(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Bucharest" });
}

function parseEurRateFromBnrXml(xml: string): { rateDate: string; eurRon: number } {
  const dateMatch = xml.match(/<Cube date="(\d{4}-\d{2}-\d{2})"/);
  const eurMatch = xml.match(/<Rate currency="EUR"[^>]*>([\d.]+)<\/Rate>/);
  if (!dateMatch || !eurMatch) {
    throw new Error("BNR feed did not contain an EUR rate in the expected format");
  }
  return { rateDate: dateMatch[1], eurRon: Number(eurMatch[1]) };
}

async function fetchRateFromBnr(): Promise<ExchangeRate> {
  const res = await fetch(BNR_FEED_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`BNR feed request failed: ${res.status}`);
  const xml = await res.text();
  const { rateDate, eurRon } = parseEurRateFromBnrXml(xml);
  return { rateDate, eurRon };
}

/** Returns today's EUR/RON rate, serving from cache when already fetched
 * today and otherwise pulling BNR's feed. Falls back to the most recent
 * cached rate if BNR is unreachable (e.g. weekends, outages) rather than
 * failing price displays outright. Regular users read with a client that
 * can't write `exchange_rates` (only the daily cron, via the admin client,
 * persists new rows) — the cache-miss branch below still returns the
 * freshly-fetched rate for that request, it just isn't persisted until the
 * cron (or an admin-client caller) runs. */
export async function getTodaysRate(client: ExchangeRatesApiClient): Promise<ExchangeRate | null> {
  const today = todayInRomania();
  const cached = await client.getRateByDate(today);
  if (cached) return cached;

  try {
    const fetched = await fetchRateFromBnr();
    await client.upsertRate(fetched).catch(() => {});
    return fetched;
  } catch {
    return client.getLatestRate();
  }
}
