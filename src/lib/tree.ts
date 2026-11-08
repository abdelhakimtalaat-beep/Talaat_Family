// Pure tree logic: layout, search, validation. No framework imports so it can be tested with plain node.
export type Person = {
  id: string; full_name: string; occupation: string | null; birth_date: string | null; death_date: string | null;
  phone: string | null; address: string | null; maps_url: string | null; photo: string | null; notes: string | null;
};
export type Edge = { parent: string; child: string; position: number };

export const BOX = { w: 184, h: 76, gapX: 24, gapY: 64 };

export type LaidOut = {
  nodes: { id: string; x: number; y: number; hasChildren: boolean; collapsed: boolean }[];
  edges: { from: string; to: string }[];
  width: number; height: number;
};

export function childrenMap(edges: Edge[]) {
  const m = new Map<string, string[]>();
  for (const e of [...edges].sort((a, b) => a.position - b.position)) {
    if (!m.has(e.parent)) m.set(e.parent, []);
    m.get(e.parent)!.push(e.child);
  }
  return m;
}

export function roots(people: Person[], edges: Edge[]) {
  const kids = new Set(edges.map((e) => e.child));
  return people.filter((p) => !kids.has(p.id)).map((p) => p.id);
}

/** Top-down tidy layout. x grows left to right; the view mirrors it for right-to-left reading. */
export function layout(people: Person[], edges: Edge[], collapsed: Set<string>): LaidOut {
  const kids = childrenMap(edges);
  const ids = new Set(people.map((p) => p.id));
  const widths = new Map<string, number>();
  const seen = new Set<string>();
  const measure = (id: string): number => {
    seen.add(id);
    const ch = collapsed.has(id) ? [] : (kids.get(id) ?? []).filter((c) => ids.has(c) && !seen.has(c));
    const w = ch.length ? Math.max(BOX.w, ch.reduce((a, c) => a + measure(c), 0) + BOX.gapX * (ch.length - 1)) : BOX.w;
    widths.set(id, w);
    return w;
  };
  const rs = roots(people, edges);
  seen.clear();
  rs.forEach(measure);

  const nodes: LaidOut["nodes"] = [];
  const out: LaidOut["edges"] = [];
  let maxY = 0;
  const placed = new Set<string>();
  const place = (id: string, left: number, depth: number) => {
    placed.add(id);
    const w = widths.get(id)!;
    const y = depth * (BOX.h + BOX.gapY);
    maxY = Math.max(maxY, y + BOX.h);
    const all = (kids.get(id) ?? []).filter((c) => ids.has(c));
    const isCollapsed = collapsed.has(id) && all.length > 0;
    nodes.push({ id, x: left + (w - BOX.w) / 2, y, hasChildren: all.length > 0, collapsed: isCollapsed });
    if (isCollapsed) return;
    const ch = all.filter((c) => !placed.has(c));
    const total = ch.reduce((a, c) => a + widths.get(c)!, 0) + BOX.gapX * Math.max(0, ch.length - 1);
    let x = left + (w - total) / 2;
    for (const c of ch) { out.push({ from: id, to: c }); place(c, x, depth + 1); x += widths.get(c)! + BOX.gapX; }
  };
  let x0 = 0;
  for (const r of rs) { place(r, x0, 0); x0 += widths.get(r)! + BOX.gapX * 3; }
  return { nodes, edges: out, width: Math.max(0, x0 - BOX.gapX * 3), height: maxY };
}

export function descendantsCount(id: string, edges: Edge[]) {
  const kids = childrenMap(edges);
  let n = 0; const stack = [...(kids.get(id) ?? [])]; const seen = new Set<string>();
  while (stack.length) { const c = stack.pop()!; if (seen.has(c)) continue; seen.add(c); n++; stack.push(...(kids.get(c) ?? [])); }
  return n;
}

/** Ancestors of an id (parent first), used to expand the path when searching. */
export function ancestors(id: string, edges: Edge[]) {
  const parent = new Map(edges.map((e) => [e.child, e.parent]));
  const out: string[] = []; let cur = parent.get(id);
  while (cur && !out.includes(cur)) { out.push(cur); cur = parent.get(cur); }
  return out;
}

export function normalizeArabic(s: string) {
  return s.toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
    .replace(/\s+/g, " ").trim();
}
export function searchPeople(people: Person[], q: string) {
  const n = normalizeArabic(q);
  return n ? people.filter((p) => normalizeArabic(p.full_name).includes(n)) : [];
}

/** Google Maps link: the saved link if valid, otherwise a search link built from the address. */
export function mapsLink(p: Pick<Person, "address" | "maps_url">) {
  if (p.maps_url && /^https:\/\//i.test(p.maps_url)) return p.maps_url;
  if (p.address?.trim()) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address.trim())}`;
  return null;
}

/** Egyptian numbers: 01xxxxxxxxx -> 201xxxxxxxxx; returns null when it does not look like a phone number. */
export function whatsappLink(phone: string | null) {
  if (!phone) return null;
  let d = phone.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1); else if (d.startsWith("00")) d = d.slice(2); else if (d.startsWith("0")) d = "20" + d.slice(1);
  return /^\d{8,15}$/.test(d) ? `https://wa.me/${d}` : null;
}

export type PersonInput = Partial<Pick<Person, "full_name" | "occupation" | "birth_date" | "death_date" | "phone" | "address" | "maps_url" | "notes">>;
/** Cleans form values. Returns the row to save, or an error code. */
export function validatePerson(raw: Record<string, unknown>): { ok: true; value: Required<PersonInput> } | { ok: false; error: string } {
  const s = (k: string, max: number) => { const v = String(raw[k] ?? "").trim(); return v === "" ? null : v.slice(0, max); };
  const name = s("full_name", 120);
  if (!name) return { ok: false, error: "name_required" };
  const date = (k: string) => { const v = s(k, 10); return v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null; };
  const birth = date("birth_date"), death = date("death_date");
  if (String(raw.birth_date ?? "").trim() && !birth) return { ok: false, error: "bad_date" };
  if (String(raw.death_date ?? "").trim() && !death) return { ok: false, error: "bad_date" };
  if (birth && death && death < birth) return { ok: false, error: "bad_date" };
  const maps = s("maps_url", 1000);
  if (maps && !/^https:\/\/\S+$/i.test(maps)) return { ok: false, error: "bad_url" };
  const phone = s("phone", 30);
  if (phone && !/^[\d+\-\s()]{5,30}$/.test(phone)) return { ok: false, error: "bad_phone" };
  return { ok: true, value: { full_name: name, occupation: s("occupation", 120), birth_date: birth, death_date: death, phone, address: s("address", 300), maps_url: maps, notes: s("notes", 2000) } };
}
