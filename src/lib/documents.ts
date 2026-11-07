export type ExpiryState = "none" | "ok" | "soon" | "expired";

/** Whole days from `today` to `expiry` (both YYYY-MM-DD). Negative = already expired. */
export function daysUntil(expiry: string, today: string): number {
  const a = Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10));
  const b = Date.UTC(+expiry.slice(0, 4), +expiry.slice(5, 7) - 1, +expiry.slice(8, 10));
  return Math.round((b - a) / 864e5);
}

export function expiryState(expiry: string | null, today: string, remindDays = 30): ExpiryState {
  if (!expiry) return "none";
  const d = daysUntil(expiry, today);
  if (d < 0) return "expired";
  return d <= remindDays ? "soon" : "ok";
}

/** Makes user text safe inside a PostgREST .or() filter and an ilike pattern. */
export function sanitizeSearch(q: string): string {
  return q.replace(/[,()*%_\\"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}
