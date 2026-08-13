import { describe, it, expect } from "vitest";
import { buildCentralizerRows, grossOf } from "./centralizerService";
import type { Project } from "@/features/projects/types";
import type { Situation, ProjectBilling } from "../types";

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
    project_category: "industrial",
    financial_type: "proprii",
    project_type: null,
    contract_type: [],
    manager_id: null,
    manager: null,
    client_id: null,
    client: { id: 1, name: "Acme SRL" },
    team_id: null,
    team: null,
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
    created_at: "2026-01-15T00:00:00Z",
    updated_at: "2026-02-01T00:00:00Z",
    ...overrides,
  };
}

function makeBilling(overrides: Partial<ProjectBilling> = {}): ProjectBilling {
  return {
    id: 1,
    project_id: 1,
    invoiced_net: 0,
    collected_net: 0,
    currency: "EUR",
    conversion_rate: 5,
    notes: null,
    updated_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("grossOf", () => {
  it("grosses up a net amount by the vat rate", () => {
    expect(grossOf(1000, 21)).toBeCloseTo(1210);
  });

  it("leaves the amount unchanged when vat_rate is 0", () => {
    expect(grossOf(1000, 0)).toBe(1000);
  });
});

describe("buildCentralizerRows", () => {
  it("gives a project with zero situations and zero billing a full row with executed/invoiced/collected at 0 and remaining = contract", () => {
    const project = makeProject({ id: 1, value_eur: 100000, vat_rate: 21 });
    const rows = buildCentralizerRows([project], [], []);

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

  it("only sums finalized situations, excluding drafts, and converts billing entered in the other currency", () => {
    const project = makeProject({ id: 2, value_eur: 100000, value_lei: null, vat_rate: 21, conversion_rate: 5 });
    const finalSituation = makeSituation({ id: 10, project_id: 2, status: "final", amount_eur_snapshot: 40000 });
    const draftSituation = makeSituation({ id: 11, project_id: 2, status: "draft", amount_eur_snapshot: 999999 });
    // Billing entered in RON on a project whose contract value is in EUR — mixed-currency source data.
    const billing = makeBilling({ project_id: 2, invoiced_net: 50000, collected_net: 25000, currency: "RON", conversion_rate: 5 });

    const rows = buildCentralizerRows([project], [finalSituation, draftSituation], [billing]);
    const row = rows[0];

    expect(row.eur.executed.net).toBe(40000);
    // 50000 RON / 5 = 10000 EUR net invoiced
    expect(row.eur.invoiced.net).toBeCloseTo(10000);
    expect(row.eur.collected.net).toBeCloseTo(5000);
    expect(row.lei.invoiced.net).toBe(50000);
    expect(row.lei.collected.net).toBe(25000);
  });

  it("produces unchanged gross figures when vat_rate is 0", () => {
    const project = makeProject({ id: 3, value_eur: 100000, vat_rate: 0 });
    const situation = makeSituation({ id: 20, project_id: 3, amount_eur_snapshot: 30000 });
    const billing = makeBilling({ project_id: 3, invoiced_net: 20000, collected_net: 10000, currency: "EUR" });

    const rows = buildCentralizerRows([project], [situation], [billing]);
    const row = rows[0];

    expect(row.eur.contractValue.gross).toBe(100000);
    expect(row.eur.executed.gross).toBe(30000);
    expect(row.eur.invoiced.gross).toBe(20000);
    expect(row.eur.collected.gross).toBe(10000);
  });

  it("renders a negative remaining-to-execute (over-execution) without clamping at zero", () => {
    const project = makeProject({ id: 4, value_eur: 100000, vat_rate: 0 });
    const situation = makeSituation({ id: 30, project_id: 4, amount_eur_snapshot: 150000 });

    const rows = buildCentralizerRows([project], [situation], []);
    const row = rows[0];

    expect(row.eur.remainingToExecute).toBe(-50000);
  });

  it("computes remaining-to-invoice from contract minus invoiced, not executed minus invoiced", () => {
    const project = makeProject({ id: 5, value_eur: 100000, vat_rate: 0 });
    const situation = makeSituation({ id: 40, project_id: 5, amount_eur_snapshot: 60000 });
    const billing = makeBilling({ project_id: 5, invoiced_net: 10000, currency: "EUR" });

    const rows = buildCentralizerRows([project], [situation], [billing]);
    const row = rows[0];

    // contract(100000) - invoiced(10000) = 90000, NOT executed(60000) - invoiced(10000) = 50000
    expect(row.eur.remainingToInvoice).toBe(90000);
  });
});
