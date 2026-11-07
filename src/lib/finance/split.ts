/**
 * Expense sharing engine. All math is done in integer piastres (1 EGP = 100)
 * so shares always add up exactly to the total (no floating-point drift).
 */
export type SplitMethod = "equal" | "percentage" | "fixed" | "custom";

export interface SplitInput {
  total: number; // EGP, e.g. 30000
  residents: string[]; // resident ids
  method: SplitMethod;
  /** percentage: 0-100 per resident; fixed/custom: EGP amount per resident */
  values?: Record<string, number>;
}

const toCents = (n: number) => Math.round(n * 100);
const fromCents = (c: number) => c / 100;

export function computeShares(input: SplitInput): Record<string, number> {
  const { total, residents, method, values = {} } = input;
  if (residents.length === 0) throw new Error("No residents");
  const totalC = toCents(total);
  const out: Record<string, number> = {};

  if (method === "equal") {
    const base = Math.floor(totalC / residents.length);
    let rem = totalC - base * residents.length;
    for (const r of residents) {
      out[r] = base + (rem > 0 ? 1 : 0);
      if (rem > 0) rem--;
    }
  } else if (method === "percentage") {
    const sumPct = residents.reduce((s, r) => s + (values[r] ?? 0), 0);
    if (Math.abs(sumPct - 100) > 1e-9) throw new Error("Percentages must total 100");
    let allocated = 0;
    residents.forEach((r, i) => {
      const c =
        i === residents.length - 1
          ? totalC - allocated // last resident absorbs rounding
          : Math.round((totalC * (values[r] ?? 0)) / 100);
      out[r] = c;
      allocated += c;
    });
  } else {
    // fixed / custom: amounts must add up to the total
    const sumC = residents.reduce((s, r) => s + toCents(values[r] ?? 0), 0);
    if (sumC !== totalC) throw new Error("Amounts must total the expense amount");
    for (const r of residents) out[r] = toCents(values[r] ?? 0);
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, fromCents(v)]));
}

export interface PaidBreakdown {
  contribution: number;
  ownShare: number;
  paidOnBehalfOfOthers: number;
  /** what each other resident still owes the payer for this expense */
  owedToPayer: Record<string, number>;
}

export function breakdownForPayer(
  total: number,
  payer: string,
  shares: Record<string, number>
): PaidBreakdown {
  const ownShare = shares[payer] ?? 0;
  const owedToPayer: Record<string, number> = {};
  for (const [r, s] of Object.entries(shares)) if (r !== payer) owedToPayer[r] = s;
  return {
    contribution: total,
    ownShare,
    paidOnBehalfOfOthers: fromCents(toCents(total) - toCents(ownShare)),
    owedToPayer,
  };
}

export interface LedgerExpense { paidBy: string; total: number; shares: Record<string, number>; voided?: boolean }
export interface LedgerPayment { from: string; to: string; amount: number }

/** Net balance per resident. Positive = others owe them; negative = they owe others. */
export function netBalances(
  residents: string[],
  expenses: LedgerExpense[],
  payments: LedgerPayment[]
): Record<string, number> {
  const c: Record<string, number> = Object.fromEntries(residents.map((r) => [r, 0]));
  for (const e of expenses) {
    if (e.voided) continue;
    c[e.paidBy] = (c[e.paidBy] ?? 0) + toCents(e.total);
    for (const [r, s] of Object.entries(e.shares)) c[r] = (c[r] ?? 0) - toCents(s);
  }
  for (const p of payments) {
    c[p.from] = (c[p.from] ?? 0) + toCents(p.amount);
    c[p.to] = (c[p.to] ?? 0) - toCents(p.amount);
  }
  return Object.fromEntries(Object.entries(c).map(([k, v]) => [k, fromCents(v)]));
}

/** Minimal set of transfers that settles all balances. */
export function suggestSettlements(balances: Record<string, number>) {
  const creditors = Object.entries(balances).filter(([, v]) => v > 0).map(([id, v]) => ({ id, c: toCents(v) }));
  const d = Object.entries(balances).filter(([, v]) => v < 0).map(([id, v]) => ({ id, c: Math.abs(toCents(v)) }));
  const result: { from: string; to: string; amount: number }[] = [];
  let i = 0, j = 0;
  while (i < d.length && j < creditors.length) {
    const amt = Math.min(d[i].c, creditors[j].c);
    if (amt > 0) result.push({ from: d[i].id, to: creditors[j].id, amount: fromCents(amt) });
    d[i].c -= amt; creditors[j].c -= amt;
    if (d[i].c === 0) i++;
    if (creditors[j].c === 0) j++;
  }
  return result;
}
