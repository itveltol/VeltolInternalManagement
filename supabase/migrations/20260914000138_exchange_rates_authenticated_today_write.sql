-- getTodaysRate() (src/features/exchangeRates/services/exchangeRateService.ts)
-- is called by regular authenticated users during contract creation, and on
-- a cache-miss for today's date it live-fetches BNR's feed and tries to
-- upsert the row so later callers don't re-hit BNR. Until now there was no
-- insert/update policy for `authenticated`, so that upsert always failed
-- silently (swallowed by a .catch(() => {}) in getTodaysRate) and the cache
-- never actually warmed from user traffic — only the 9am admin-client cron
-- ever populated it, meaning every contract submission with a value re-hit
-- BNR live until that day's cron succeeded. This lets authenticated users
-- write today's row only, so the first request each day warms the cache for
-- everyone else, while all historical rows stay cron/admin-only.
--
-- "Today" is pinned to Europe/Bucharest (matching todayInRomania() in
-- exchangeRateService.ts), not the DB session's own timezone, so the policy
-- doesn't silently reopen a mismatch window near local midnight.
--
-- Postgres resolves upsert(..., { onConflict: "rate_date" }) to a plain
-- INSERT ... ON CONFLICT DO UPDATE, and RLS requires whichever branch is
-- actually taken to pass its own policy — so both an insert and an update
-- policy are needed even though a single call only ever exercises one.
create policy "exchange_rates: authenticated insert today"
  on public.exchange_rates for insert
  to authenticated
  with check (rate_date = (now() at time zone 'Europe/Bucharest')::date);

create policy "exchange_rates: authenticated update today"
  on public.exchange_rates for update
  to authenticated
  using (rate_date = (now() at time zone 'Europe/Bucharest')::date)
  with check (rate_date = (now() at time zone 'Europe/Bucharest')::date);

-- Deliberately no delete policy for authenticated: only cron/service role
-- may delete, and this feature never needs to.
