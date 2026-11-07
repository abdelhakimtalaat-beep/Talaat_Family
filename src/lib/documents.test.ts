import { describe, it, expect } from "vitest";
import { daysUntil, expiryState, sanitizeSearch } from "./documents";

describe("expiry", () => {
  it("counts days", () => {
    expect(daysUntil("2026-12-01", "2026-11-07")).toBe(24);
    expect(daysUntil("2026-11-01", "2026-11-07")).toBe(-6);
  });
  it("classifies", () => {
    expect(expiryState(null, "2026-11-07")).toBe("none");
    expect(expiryState("2026-11-06", "2026-11-07")).toBe("expired");
    expect(expiryState("2026-11-07", "2026-11-07")).toBe("soon");
    expect(expiryState("2026-12-07", "2026-11-07", 30)).toBe("soon");
    expect(expiryState("2026-12-08", "2026-11-07", 30)).toBe("ok");
    expect(expiryState("2027-06-01", "2026-11-07", 365)).toBe("soon");
  });
});

describe("sanitizeSearch", () => {
  it("strips filter-breaking characters", () => {
    expect(sanitizeSearch("a,b)(c%d*e")).toBe("a b c d e");
    expect(sanitizeSearch("  جواز   سفر ")).toBe("جواز سفر");
  });
});
