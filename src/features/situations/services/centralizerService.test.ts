import { describe, it, expect } from "vitest";
import { buildCentralizerRows } from "./centralizerService";
import type { Project } from "@/features/projects/types";
import type { Situation } from "../types";

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    name: "Test Project",
    county: null,
    site_location: null,
    site_lat: null,
    site_lng: null,
    mw_solar: null,
    mw_bess: null,
    people_needed: null,
    project_category: "industrial",
    financial_type: "proprii",
    project_type: null,
    contract_type: [],
    manager_id: null,
    manager: null,
    sales_id: null,
    client_id: null,
    client: { id: 1, name: "Acme SRL" },
    execution_mode: "internal",
    subcontractor_assignment_id: null,
    subcontractor: null,
    current_phase: "construction",
    progress_pct: 0,
    contract_number: "CT-001",
    contract_date: "2026-01-01",
    deadline: null,
    value_eur: 100000,
    value_lei: null,
    currency: "EUR",
    conversion_rate: 5,
    vat_rate: 21,
    status: "on_schedule",
    status_manual: false,
    notes: null,
    paid_by: null,
    onedrive_folder_id: null,
    onedrive_folder_url: null,
    planning_start_date: null,
    planning_end_date: null,
    execution_start_date: null,
    execution_end_date: null,
    autorizare_start_date: null,
    autorizare_end_date: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    updated_by: null,
    updated_by_user: null,
    ...overrides,
  };
}

function makeSituation(overrides: Partial<Situation> = {}): Situation {
  return {
    id: 1,
    project_id: 1,
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
  it("gives a project with zero situations and zero progress a full row with executed/invoiced/collected at 0 and remaining = contract", () => {
    const project = makeProject({ id: 1, value_eur: 100000, vat_rate: 21, progress_pct: 0 });
    const rows = buildCentralizerRows([project], []);

    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.eur.executed.net).toBe(0);
    expect(row.eur.invoiced.net).toBe(0);
    expect(row.eur.collected.net).toBe(0);
    expect(row.eur.contractValue.gross).toBeCloseTo(121000);
    expect(row.eur.remainingToExecute).toBeCloseTo(121000);
    expect(row.eur.remainingToInvoice).toBeCloseTo(121000);
    expect(row.eur.remainingToCollect).toBe(0);
  });

  it("derives executed from live progress_pct × contract value, independent of any situations existing", () => {
    const project = makeProject({ id: 2, value_eur: 100000, vat_rate: 0, progress_pct: 40 });
    const rows = buildCentralizerRows([project], []);
    const row = rows[0];

    expect(row.eur.executed.net).toBe(40000);
  });

  it("only sums final-or-paid situations for invoiced/collected, excluding drafts", () => {
    const project = makeProject({ id: 3, value_eur: 100000, value_lei: null, vat_rate: 21, conversion_rate: 5, progress_pct: 0 });
    const finalSituation = makeSituation({ id: 10, project_id: 3, status: "final", amount_eur_snapshot: 40000 });
    const draftSituation = makeSituation({ id: 11, project_id: 3, status: "draft", amount_eur_snapshot: 999999 });

    const rows = buildCentralizerRows([project], [finalSituation, draftSituation]);
    const row = rows[0];

    expect(row.eur.invoiced.net).toBe(40000);
    expect(row.eur.collected.net).toBe(0);
  });

  it("keeps facturat cumulative regardless of payment state, while incasat only counts paid situations", () => {
    const project = makeProject({ id: 6, value_eur: 100000, vat_rate: 0, progress_pct: 0 });
    const finalOnly = makeSituation({ id: 50, project_id: 6, status: "final", amount_eur_snapshot: 30000, finalized_at: "2026-02-01T00:00:00Z" });
    const paid = makeSituation({ id: 51, project_id: 6, status: "paid", amount_eur_snapshot: 20000, finalized_at: "2026-03-01T00:00:00Z", paid_at: "2026-03-15T00:00:00Z" });

    const rows = buildCentralizerRows([project], [finalOnly, paid]);
    const row = rows[0];

    expect(row.eur.invoiced.net).toBe(50000);
    expect(row.eur.collected.net).toBe(20000);
  });

  it("lets executed and invoiced diverge: executed tracks live progress, invoiced tracks finalized situations, independently", () => {
    const project = makeProject({ id: 8, value_eur: 100000, vat_rate: 0, progress_pct: 70 });
    // Only one situation finalized so far, well below current progress — the paperwork lags the work.
    const finalOnly = makeSituation({ id: 70, project_id: 8, status: "final", amount_eur_snapshot: 30000 });

    const rows = buildCentralizerRows([project], [finalOnly]);
    const row = rows[0];

    expect(row.eur.executed.net).toBe(70000);
    expect(row.eur.invoiced.net).toBe(30000);
  });

  it("keeps remaining-to-collect (outstanding AR) as the unpaid final situation's amount, not negative", () => {
    const project = makeProject({ id: 7, value_eur: 100000, vat_rate: 0, progress_pct: 0 });
    const finalOnly = makeSituation({ id: 60, project_id: 7, status: "final", amount_eur_snapshot: 30000, finalized_at: "2026-02-01T00:00:00Z" });
    const paid = makeSituation({ id: 61, project_id: 7, status: "paid", amount_eur_snapshot: 20000, finalized_at: "2026-03-01T00:00:00Z", paid_at: "2026-03-15T00:00:00Z" });

    const rows = buildCentralizerRows([project], [finalOnly, paid]);
    const row = rows[0];

    // invoiced(50000) - collected(20000) = 30000, i.e. exactly the still-unpaid situation
    expect(row.eur.remainingToCollect).toBe(30000);
  });

  it("produces unchanged gross figures when vat_rate is 0", () => {
    const project = makeProject({ id: 3, value_eur: 100000, vat_rate: 0, progress_pct: 30 });
    const situation = makeSituation({ id: 20, project_id: 3, status: "paid", amount_eur_snapshot: 30000 });

    const rows = buildCentralizerRows([project], [situation]);
    const row = rows[0];

    expect(row.eur.contractValue.gross).toBe(100000);
    expect(row.eur.executed.gross).toBe(30000);
    expect(row.eur.invoiced.gross).toBe(30000);
    expect(row.eur.collected.gross).toBe(30000);
  });

  it("gives executed a VAT-grossed display value alongside the net progress figure, and computes remaining-to-execute gross-to-gross, when vat_rate is nonzero", () => {
    const project = makeProject({ id: 9, value_eur: 100000, vat_rate: 21, progress_pct: 30 });

    const rows = buildCentralizerRows([project], []);
    const row = rows[0];

    // net = 30% of the net contract value; gross = net grossed up by 21% VAT
    expect(row.eur.executed.net).toBe(30000);
    expect(row.eur.executed.gross).toBeCloseTo(36300);
    // remaining-to-execute compares gross contract value to gross executed, matching every other centralizer column
    expect(row.eur.remainingToExecute).toBeCloseTo(121000 - 36300);
  });

  it("renders a negative remaining-to-execute (over-execution) without clamping at zero", () => {
    const project = makeProject({ id: 4, value_eur: 100000, vat_rate: 0, progress_pct: 150 });

    const rows = buildCentralizerRows([project], []);
    const row = rows[0];

    expect(row.eur.remainingToExecute).toBe(-50000);
  });

  it("computes remaining-to-invoice from contract minus invoiced", () => {
    const project = makeProject({ id: 5, value_eur: 100000, vat_rate: 0, progress_pct: 0 });
    const situation = makeSituation({ id: 40, project_id: 5, amount_eur_snapshot: 60000 });

    const rows = buildCentralizerRows([project], [situation]);
    const row = rows[0];

    // contract(100000) - invoiced(60000) = 40000
    expect(row.eur.remainingToInvoice).toBe(40000);
  });
});
