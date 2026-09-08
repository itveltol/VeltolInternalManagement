export interface AnafCompanyInfo {
  name: string;
  regAddress: string | null;
  jNumber: string | null;
  isActive: boolean;
  isVatPayer: boolean;
}

const ANAF_TVA_URL = "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildAddress(dateGenerale: Record<string, unknown>): string | null {
  const address = dateGenerale.adresa;
  if (typeof address === "string" && address.trim() !== "") return address.trim();
  return null;
}

/** Looks up a Romanian company's registered data from ANAF's public tax-payer
 * API by CUI (numeric, without the "RO" prefix). Throws on any failure —
 * this is a user-initiated, one-off lookup, not a cached background fetch,
 * so callers surface the error directly rather than falling back silently. */
export async function lookupCompanyByCui(numericCui: string): Promise<AnafCompanyInfo> {
  const res = await fetch(ANAF_TVA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ cui: Number(numericCui), data: todayIso() }]),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`ANAF request failed: ${res.status}`);

  const body = await res.json();
  const entry = body?.found?.[0];
  if (!entry) throw new Error("Company not found in ANAF registry");

  const dateGenerale = entry.date_generale ?? {};
  const inactiv = entry.stare_inactiv?.statusInactivi ?? false;
  const platitorTva = entry.inregistrare_scop_Tva?.scpTVA ?? false;

  const name = typeof dateGenerale.denumire === "string" ? dateGenerale.denumire.trim() : "";
  if (!name) throw new Error("ANAF response did not include a company name");

  return {
    name,
    regAddress: buildAddress(dateGenerale),
    jNumber: typeof dateGenerale.nrRegCom === "string" ? dateGenerale.nrRegCom.trim() : null,
    isActive: !inactiv,
    isVatPayer: Boolean(platitorTva),
  };
}
