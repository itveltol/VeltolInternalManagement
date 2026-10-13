import type { ExchangeRatesApiClient } from "../api/types";
import type { ExchangeRate } from "../types";

// BNR moved this feed off www.bnr.ro to a dedicated subdomain; the old path
// now 404s / redirects to the homepage instead of returning XML.
const BNR_FEED_URL = "https://curs.bnr.ro/nbrfxrates.xml";

/** BNR publishes one rate per Romanian business day — key cache lookups by
 * the Romanian calendar date, not the server's local date, so the cache
 * doesn't roll over at the wrong instant for a server running in another zone. */
function todayInRomania(now: Date): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Europe/Bucharest" });
}

// BNR publishes the day's rate around 13:00 Romanian time on business days.
// Until then (and all weekend) its feed still serves the previous business
// day's rate, so a stored rate from that day is exactly what a live fetch
// would return — no need to hit BNR. Anything older (missed cron, public
// holiday) still goes to BNR, same as before.
const BNR_PUBLISH_HOUR_RO = 13;

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function romaniaClock(now: Date): { hour: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Bucharest",
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const weekday = WEEKDAY_INDEX[parts.find((p) => p.type === "weekday")?.value ?? ""] ?? -1;
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  return { hour, weekday };
}

function daysBetween(fromDate: string, toDate: string): number {
  return Math.round((Date.parse(toDate) - Date.parse(fromDate)) / 86_400_000);
}

/** Days back to the business day whose rate BNR's feed is serving right now
 * (holidays aside), or null once today's rate should be out (weekday ≥ 13:00). */
function daysSinceLatestPublication(now: Date): number | null {
  const { hour, weekday } = romaniaClock(now);
  if (weekday === 6) return 1; // Sat → Fri
  if (weekday === 0) return 2; // Sun → Fri
  if (hour >= BNR_PUBLISH_HOUR_RO) return null;
  return weekday === 1 ? 3 : 1; // Mon morning → Fri, other mornings → yesterday
}

function isStoredRateStillCurrent(rate: ExchangeRate, now: Date): boolean {
  const expectedAge = daysSinceLatestPublication(now);
  if (expectedAge === null) return false;
  const age = daysBetween(rate.rateDate, todayInRomania(now));
  return age >= 0 && age <= expectedAge;
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
  // Bounded so a hung/slow BNR connection can't stall the page render that's
  // awaiting getTodaysRate() — callers already fall back to the last cached
  // rate on any failure, timeouts included.
  const res = await fetch(BNR_FEED_URL, { cache: "no-store", signal: AbortSignal.timeout(3000) });
  if (!res.ok) throw new Error(`BNR feed request failed: ${res.status}`);
  const xml = await res.text();
  const { rateDate, eurRon } = parseEurRateFromBnrXml(xml);
  return { rateDate, eurRon };
}

/** Returns today's EUR/RON rate. Serves the stored rate when it's today's,
 * or when BNR can't have published a newer one yet (before ~13:00 Romanian
 * time, weekends — see isStoredRateStillCurrent); otherwise pulls BNR's feed.
 * Falls back to the most recent stored rate if BNR is unreachable (e.g.
 * outages) rather than failing price displays outright. Regular users can
 * only persist today's row (RLS, 20260914000138), so a fetch that returns an
 * older-dated rate (holidays) just isn't cached — the cron, via the admin
 * client, persists every published rate (see refreshRateFromBnr). */
export async function getTodaysRate(
  client: ExchangeRatesApiClient,
  now: Date = new Date(),
): Promise<ExchangeRate | null> {
  const latest = await client.getLatestRate();
  if (latest && (latest.rateDate === todayInRomania(now) || isStoredRateStillCurrent(latest, now))) {
    return latest;
  }

  try {
    const fetched = await fetchRateFromBnr();
    await client.upsertRate(fetched).catch(() => {});
    return fetched;
  } catch {
    return latest;
  }
}

/** Always pulls BNR's feed and stores the result, bypassing the stored-rate
 * shortcut in getTodaysRate. Used by the daily cron, scheduled after BNR's
 * ~13:00 publication so the next morning's requests are served from storage. */
export async function refreshRateFromBnr(client: ExchangeRatesApiClient): Promise<ExchangeRate> {
  const fetched = await fetchRateFromBnr();
  await client.upsertRate(fetched);
  return fetched;
}

/** Returns the EUR/RON rate for a specific date if BNR published one and it's
 * cached, else falls back to today's rate (see getTodaysRate) — BNR's live
 * feed only ever exposes the current day, so a historical date can only be
 * satisfied when that date's row already exists in exchange_rates. */
export async function getRateForDate(
  client: ExchangeRatesApiClient,
  date: string | null,
  now: Date = new Date(),
): Promise<ExchangeRate | null> {
  if (date) {
    const cached = await client.getRateByDate(date);
    if (cached) return cached;
  }
  return getTodaysRate(client, now);
}
