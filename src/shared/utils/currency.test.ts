import { describe, it, expect } from "vitest";
import { grossOf } from "./currency";

describe("grossOf", () => {
  it("grosses up a net amount by the vat rate", () => {
    expect(grossOf(1000, 21)).toBeCloseTo(1210);
  });

  it("leaves the amount unchanged when vat_rate is 0", () => {
    expect(grossOf(1000, 0)).toBe(1000);
  });
});
