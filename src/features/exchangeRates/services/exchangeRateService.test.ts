import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getRateForDate, getTodaysRate, refreshRateFromBnr } from "./exchangeRateService";
import type { ExchangeRatesApiClient } from "../api/types";
import type { ExchangeRate } from "../types";

function fakeClient(rows: ExchangeRate[]) {
  const upserts: ExchangeRate[] = [];
  const client: ExchangeRatesApiClient = {
    async getRateByDate(date) {
      return rows.find((r) => r.rateDate === date) ?? null;
    },
    async getLatestRate() {
      return rows.slice().sort((a, b) => b.rateDate.localeCompare(a.rateDate))[0] ?? null;
    },
    async upsertRate(rate) {
      upserts.push(rate);
    },
  };
  return { client, upserts };
}

function bnrXml(date: string, eur: string) {
  return `<DataSet><Body><Cube date="${date}"><Rate currency="USD">4.3</Rate><Rate currency="EUR">${eur}</Rate></Cube></Body></DataSet>`;
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function bnrReturns(date: string, eur: string) {
  fetchMock.mockResolvedValue(new Response(bnrXml(date, eur), { status: 200 }));
}

// 2026-10-12 is a Monday; Romania is UTC+3 until 2026-10-25, UTC+2 after.
describe("getTodaysRate", () => {
  it("serves today's stored row without calling BNR", async () => {
    const { client } = fakeClient([{ rateDate: "2026-10-13", eurRon: 5.1 }]);
    const rate = await getTodaysRate(client, new Date("2026-10-13T15:00:00+03:00"));
    expect(rate).toEqual({ rateDate: "2026-10-13", eurRon: 5.1 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("serves Friday's rate on Monday morning without calling BNR", async () => {
    const { client } = fakeClient([{ rateDate: "2026-10-09", eurRon: 5.09 }]);
    const rate = await getTodaysRate(client, new Date("2026-10-12T10:00:00+03:00"));
    expect(rate).toEqual({ rateDate: "2026-10-09", eurRon: 5.09 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("serves yesterday's rate on a weekday morning without calling BNR", async () => {
    const { client } = fakeClient([{ rateDate: "2026-10-12", eurRon: 5.1 }]);
    await getTodaysRate(client, new Date("2026-10-13T12:59:00+03:00"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("serves Friday's rate all weekend without calling BNR", async () => {
    const { client } = fakeClient([{ rateDate: "2026-10-09", eurRon: 5.09 }]);
    await getTodaysRate(client, new Date("2026-10-10T16:00:00+03:00"));
    await getTodaysRate(client, new Date("2026-10-11T22:00:00+03:00"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses Romanian time, not UTC, in winter too", async () => {
    const { client } = fakeClient([{ rateDate: "2026-12-14", eurRon: 5.1 }]);
    // 12:30 in Bucharest (UTC+2) — still before publication.
    await getTodaysRate(client, new Date("2026-12-15T10:30:00Z"));
    expect(fetchMock).not.toHaveBeenCalled();
    // 13:30 in Bucharest — today's rate should be out.
    bnrReturns("2026-12-15", "5.11");
    await getTodaysRate(client, new Date("2026-12-15T11:30:00Z"));
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("fetches and caches once BNR has published (weekday afternoon)", async () => {
    const { client, upserts } = fakeClient([{ rateDate: "2026-10-12", eurRon: 5.1 }]);
    bnrReturns("2026-10-13", "5.12");
    const rate = await getTodaysRate(client, new Date("2026-10-13T14:00:00+03:00"));
    expect(rate).toEqual({ rateDate: "2026-10-13", eurRon: 5.12 });
    expect(upserts).toEqual([{ rateDate: "2026-10-13", eurRon: 5.12 }]);
  });

  it("fetches when the stored rate is older than the last business day", async () => {
    // Monday morning, but Friday's rate was never stored.
    const { client } = fakeClient([{ rateDate: "2026-10-08", eurRon: 5.08 }]);
    bnrReturns("2026-10-09", "5.09");
    const rate = await getTodaysRate(client, new Date("2026-10-12T09:00:00+03:00"));
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(rate).toEqual({ rateDate: "2026-10-09", eurRon: 5.09 });
  });

  it("fetches when nothing is stored", async () => {
    const { client } = fakeClient([]);
    bnrReturns("2026-10-09", "5.09");
    const rate = await getTodaysRate(client, new Date("2026-10-12T09:00:00+03:00"));
    expect(rate).toEqual({ rateDate: "2026-10-09", eurRon: 5.09 });
  });

  it("falls back to the latest stored rate when BNR is unreachable", async () => {
    const { client } = fakeClient([{ rateDate: "2026-10-01", eurRon: 5.05 }]);
    fetchMock.mockRejectedValue(new Error("timeout"));
    const rate = await getTodaysRate(client, new Date("2026-10-13T14:00:00+03:00"));
    expect(rate).toEqual({ rateDate: "2026-10-01", eurRon: 5.05 });
  });

  it("still returns the fetched rate when caching it is rejected", async () => {
    const { client } = fakeClient([]);
    client.upsertRate = async () => {
      throw new Error("new row violates row-level security policy");
    };
    bnrReturns("2026-10-13", "5.12");
    const rate = await getTodaysRate(client, new Date("2026-10-13T14:00:00+03:00"));
    expect(rate).toEqual({ rateDate: "2026-10-13", eurRon: 5.12 });
  });
});

describe("getRateForDate", () => {
  it("returns the exact date's stored rate when present", async () => {
    const { client } = fakeClient([
      { rateDate: "2026-09-01", eurRon: 5.0 },
      { rateDate: "2026-10-12", eurRon: 5.1 },
    ]);
    const rate = await getRateForDate(client, "2026-09-01", new Date("2026-10-13T10:00:00+03:00"));
    expect(rate).toEqual({ rateDate: "2026-09-01", eurRon: 5.0 });
  });

  it("falls back to today's rate for a date with no stored row", async () => {
    const { client } = fakeClient([{ rateDate: "2026-10-12", eurRon: 5.1 }]);
    const rate = await getRateForDate(client, "2026-09-02", new Date("2026-10-13T10:00:00+03:00"));
    expect(rate).toEqual({ rateDate: "2026-10-12", eurRon: 5.1 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("refreshRateFromBnr", () => {
  it("always fetches and stores, even when a current rate is stored", async () => {
    const { client, upserts } = fakeClient([{ rateDate: "2026-10-13", eurRon: 5.1 }]);
    bnrReturns("2026-10-13", "5.12");
    const rate = await refreshRateFromBnr(client);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(rate).toEqual({ rateDate: "2026-10-13", eurRon: 5.12 });
    expect(upserts).toEqual([{ rateDate: "2026-10-13", eurRon: 5.12 }]);
  });

  it("throws when BNR is unreachable", async () => {
    const { client } = fakeClient([]);
    fetchMock.mockRejectedValue(new Error("timeout"));
    await expect(refreshRateFromBnr(client)).rejects.toThrow("timeout");
  });
});
