import { describe, it, expect } from "vitest";
import { buildCentralizerRows } from "./centralizerService";
import type { SituationContractRef, Situation } from "../types";

function makeContract(overrides: Partial<SituationContractRef> = {}): SituationContractRef {
  return {
    id: 1,
    project_id: 1,
    value_eur: 100000,
    value_lei: null,
    currency: "EUR",
    conversion_rate: 5,
    contract_number: "CT-001",
    contract_date: "2026-01-01",
    contract_type: ["proiectare", "executie"],
    vat_rate: 21,
    progress_pct: 0,
    project: {
      id: 1,
      name: "Test Project",
      project_category: "industrial",
      current_phase: "construction",
      client: { id: 1, name: "Acme SRL" },
    },
    ...overrides,
  };
}

function makeSituation(overrides: Partial<Situation> = {}): Situation {
  return {
    id: 1,
    project_id: 1,
    contract_id: 1,
    name: "Situatie 1",
    status: "final",
    pct_snapshot: 50,
    amount_eur_snapshot: 50000,
    amount_lei_snapshot: null,
    conversion_rate: 5,
    finalized_at: "2026-02-01T00:00:00Z",
    paid_at: null,
    created_at: "2026-01-15T00:00:00Z",
    updated_at: "2026-02-01T00:00:00Z",
    ...overrides,
  };
}

describe("buildCentralizerRows", () => {
  it("gives a contract with zero situations and zero progress a full row with executed/invoiced/collected at 0 and remaining = contract", () => {
    const contract = makeContract({ id: 1, value_eur: 100000, vat_rate: 21, progress_pct: 0 });
    const rows = buildCentralizerRows([contract], []);

    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.eur.executed!.net).toBe(0);
    expect(row.eur.invoiced.net).toBe(0);
    expect(row.eur.collected.net).toBe(0);
    expect(row.eur.contractValue.gross).toBeCloseTo(121000);
    expect(row.eur.remainingToExecute).toBeCloseTo(121000);
    expect(row.eur.remainingToInvoice).toBeCloseTo(121000);
    expect(row.eur.remainingToCollect).toBe(0);
  });

  it("derives executed from this contract's own progress_pct × contract value, independent of any situations existing", () => {
    const contract = makeContract({ id: 2, value_eur: 100000, vat_rate: 0, progress_pct: 40 });
    const rows = buildCentralizerRows([contract], []);
    const row = rows[0];

    expect(row.eur.executed!.net).toBe(40000);
  });

  it("only sums final-or-paid situations for invoiced/collected, excluding drafts", () => {
    const contract = makeContract({ id: 3, value_eur: 100000, value_lei: null, vat_rate: 21, conversion_rate: 5, progress_pct: 0 });
    const finalSituation = makeSituation({ id: 10, contract_id: 3, status: "final", amount_eur_snapshot: 40000 });
    const draftSituation = makeSituation({ id: 11, contract_id: 3, status: "draft", amount_eur_snapshot: 999999 });

    const rows = buildCentralizerRows([contract], [finalSituation, draftSituation]);
    const row = rows[0];

    expect(row.eur.invoiced.net).toBe(40000);
    expect(row.eur.collected.net).toBe(0);
  });

  it("keeps facturat cumulative regardless of payment state, while incasat only counts paid situations", () => {
    const contract = makeContract({ id: 6, value_eur: 100000, vat_rate: 0, progress_pct: 0 });
    const finalOnly = makeSituation({ id: 50, contract_id: 6, status: "final", amount_eur_snapshot: 30000, finalized_at: "2026-02-01T00:00:00Z" });
    const paid = makeSituation({ id: 51, contract_id: 6, status: "paid", amount_eur_snapshot: 20000, finalized_at: "2026-03-01T00:00:00Z", paid_at: "2026-03-15T00:00:00Z" });

    const rows = buildCentralizerRows([contract], [finalOnly, paid]);
    const row = rows[0];

    expect(row.eur.invoiced.net).toBe(50000);
    expect(row.eur.collected.net).toBe(20000);
  });

  it("lets executed and invoiced diverge: executed tracks this contract's live progress, invoiced tracks finalized situations, independently", () => {
    const contract = makeContract({ id: 8, value_eur: 100000, vat_rate: 0, progress_pct: 70 });
    // Only one situation finalized so far, well below current progress — the paperwork lags the work.
    const finalOnly = makeSituation({ id: 70, contract_id: 8, status: "final", amount_eur_snapshot: 30000 });

    const rows = buildCentralizerRows([contract], [finalOnly]);
    const row = rows[0];

    expect(row.eur.executed!.net).toBe(70000);
    expect(row.eur.invoiced.net).toBe(30000);
  });

  it("keeps remaining-to-collect (outstanding AR) as the unpaid final situation's amount, not negative", () => {
    const contract = makeContract({ id: 7, value_eur: 100000, vat_rate: 0, progress_pct: 0 });
    const finalOnly = makeSituation({ id: 60, contract_id: 7, status: "final", amount_eur_snapshot: 30000, finalized_at: "2026-02-01T00:00:00Z" });
    const paid = makeSituation({ id: 61, contract_id: 7, status: "paid", amount_eur_snapshot: 20000, finalized_at: "2026-03-01T00:00:00Z", paid_at: "2026-03-15T00:00:00Z" });

    const rows = buildCentralizerRows([contract], [finalOnly, paid]);
    const row = rows[0];

    // invoiced(50000) - collected(20000) = 30000, i.e. exactly the still-unpaid situation
    expect(row.eur.remainingToCollect).toBe(30000);
  });

  it("produces unchanged gross figures when vat_rate is 0", () => {
    const contract = makeContract({ id: 3, value_eur: 100000, vat_rate: 0, progress_pct: 30 });
    const situation = makeSituation({ id: 20, contract_id: 3, status: "paid", amount_eur_snapshot: 30000 });

    const rows = buildCentralizerRows([contract], [situation]);
    const row = rows[0];

    expect(row.eur.contractValue.gross).toBe(100000);
    expect(row.eur.executed!.gross).toBe(30000);
    expect(row.eur.invoiced.gross).toBe(30000);
    expect(row.eur.collected.gross).toBe(30000);
  });

  it("gives executed a VAT-grossed display value alongside the net progress figure, and computes remaining-to-execute gross-to-gross, when vat_rate is nonzero", () => {
    const contract = makeContract({ id: 9, value_eur: 100000, vat_rate: 21, progress_pct: 30 });

    const rows = buildCentralizerRows([contract], []);
    const row = rows[0];

    // net = 30% of the net contract value; gross = net grossed up by 21% VAT
    expect(row.eur.executed!.net).toBe(30000);
    expect(row.eur.executed!.gross).toBeCloseTo(36300);
    // remaining-to-execute compares gross contract value to gross executed, matching every other centralizer column
    expect(row.eur.remainingToExecute).toBeCloseTo(121000 - 36300);
  });

  it("renders a negative remaining-to-execute (over-execution) without clamping at zero", () => {
    const contract = makeContract({ id: 4, value_eur: 100000, vat_rate: 0, progress_pct: 150 });

    const rows = buildCentralizerRows([contract], []);
    const row = rows[0];

    expect(row.eur.remainingToExecute).toBe(-50000);
  });

  it("computes remaining-to-invoice from contract minus invoiced", () => {
    const contract = makeContract({ id: 5, value_eur: 100000, vat_rate: 0, progress_pct: 0 });
    const situation = makeSituation({ id: 40, contract_id: 5, amount_eur_snapshot: 60000 });

    const rows = buildCentralizerRows([contract], [situation]);
    const row = rows[0];

    // contract(100000) - invoiced(60000) = 40000
    expect(row.eur.remainingToInvoice).toBe(40000);
  });

  it("gives a residential project's contract null executed/remaining-to-execute instead of a misleading 0, since it has no Matrice coverage", () => {
    const contract = makeContract({
      id: 11,
      value_eur: 100000,
      vat_rate: 0,
      progress_pct: 0,
      project: { id: 11, name: "Residential Project", project_category: "residential", current_phase: "construction", client: null },
    });
    const situation = makeSituation({ id: 80, contract_id: 11, status: "final", amount_eur_snapshot: 25000 });

    const rows = buildCentralizerRows([contract], [situation]);
    const row = rows[0];

    expect(row.projectCategory).toBe("residential");
    expect(row.eur.executed).toBeNull();
    expect(row.eur.remainingToExecute).toBeNull();
    // Facturat/Încasat are unaffected — they're situation-event facts, not progress-derived.
    expect(row.eur.invoiced.net).toBe(25000);
  });

  it("gives each contract on a project its own contractId while sharing projectId, so a project with two contracts gets two rows", () => {
    const sharedProject = { id: 30, name: "Test Project", project_category: "industrial" as const, current_phase: "construction", client: { id: 1, name: "Acme SRL" } };
    const proiectareExecutie = makeContract({ id: 20, project_id: 30, contract_type: ["proiectare", "executie"], progress_pct: 100, project: sharedProject });
    const racordare = makeContract({ id: 21, project_id: 30, contract_type: ["racordare"], progress_pct: 10, project: sharedProject });

    const rows = buildCentralizerRows([proiectareExecutie, racordare], []);

    expect(rows).toHaveLength(2);
    expect(rows[0].contractId).toBe(20);
    expect(rows[1].contractId).toBe(21);
    expect(rows[0].projectId).toBe(30);
    expect(rows[1].projectId).toBe(30);
    // Each contract's own progress_pct drives its own Executat independently.
    expect(rows[0].eur.executed!.net).toBe(100000);
    expect(rows[1].eur.executed!.net).toBe(10000);
  });
});
