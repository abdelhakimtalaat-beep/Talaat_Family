import { describe, it, expect } from "vitest";
import { computeShares, breakdownForPayer, netBalances, suggestSettlements } from "./split";

const R = ["me", "mom", "sis"];

describe("computeShares", () => {
  it("splits 30,000 equally into three 10,000 shares", () => {
    expect(computeShares({ total: 30000, residents: R, method: "equal" })).toEqual({ me: 10000, mom: 10000, sis: 10000 });
  });
  it("keeps shares exactly equal to the total when not divisible", () => {
    const s = computeShares({ total: 100, residents: R, method: "equal" });
    expect(Object.values(s).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 2);
  });
  it("applies percentages", () => {
    const s = computeShares({ total: 1000, residents: R, method: "percentage", values: { me: 50, mom: 30, sis: 20 } });
    expect(s).toEqual({ me: 500, mom: 300, sis: 200 });
  });
  it("rejects percentages that do not total 100", () => {
    expect(() => computeShares({ total: 1000, residents: R, method: "percentage", values: { me: 50, mom: 30, sis: 10 } })).toThrow();
  });
  it("rejects fixed amounts that do not match the total", () => {
    expect(() => computeShares({ total: 1000, residents: R, method: "fixed", values: { me: 100, mom: 100, sis: 100 } })).toThrow();
  });
});

describe("brief example", () => {
  it("I pay 30,000: share 10,000, paid for others 20,000, each owes 10,000", () => {
    const shares = computeShares({ total: 30000, residents: R, method: "equal" });
    const b = breakdownForPayer(30000, "me", shares);
    expect(b.contribution).toBe(30000);
    expect(b.ownShare).toBe(10000);
    expect(b.paidOnBehalfOfOthers).toBe(20000);
    expect(b.owedToPayer).toEqual({ mom: 10000, sis: 10000 });
  });
});

describe("ledger", () => {
  it("balances and settlements", () => {
    const shares = computeShares({ total: 30000, residents: R, method: "equal" });
    let bal = netBalances(R, [{ paidBy: "me", total: 30000, shares }], []);
    expect(bal).toEqual({ me: 20000, mom: -10000, sis: -10000 });
    bal = netBalances(R, [{ paidBy: "me", total: 30000, shares }], [{ from: "mom", to: "me", amount: 10000 }]);
    expect(bal).toEqual({ me: 10000, mom: 0, sis: -10000 });
    expect(suggestSettlements(bal)).toEqual([{ from: "sis", to: "me", amount: 10000 }]);
  });
  it("ignores voided expenses", () => {
    const shares = computeShares({ total: 300, residents: R, method: "equal" });
    expect(netBalances(R, [{ paidBy: "me", total: 300, shares, voided: true }], [])).toEqual({ me: 0, mom: 0, sis: 0 });
  });
});
