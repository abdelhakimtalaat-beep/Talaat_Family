"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadToDrive } from "@/lib/google/upload-client";
import type { TreeT } from "@/lib/i18n";
import { BOX, ancestors, descendantsCount, layout, mapsLink, searchPeople, whatsappLink, type Edge, type Person } from "@/lib/tree";
import { addParent, addPerson, deletePerson, setPhoto, updatePerson } from "./actions";

const input = "w-full rounded-xl border border-mist bg-warm px-3 py-2 outline-none focus:border-gold";
const btn = "rounded-xl border border-mist px-3 py-1.5 text-sm hover:bg-mist";

/** Shrinks a photo to at most 640px and re-encodes as JPEG so uploads are small. */
async function shrink(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 640 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], `profile-${Date.now()}.jpg`, { type: "image/jpeg" }) : file;
  } catch { return file; }
}
const ageOf = (b: string | null, d: string | null) => {
  if (!b) return null;
  const end = d ? new Date(d) : new Date(), s = new Date(b);
  let a = end.getFullYear() - s.getFullYear();
  if (end.getMonth() < s.getMonth() || (end.getMonth() === s.getMonth() && end.getDate() < s.getDate())) a--;
  return a >= 0 ? a : null;
};

function Avatar({ p, size }: { p: Person; size: number }) {
  return p.photo
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={p.photo} alt="" width={size} height={size} loading="lazy" className="shrink-0 rounded-full object-cover ring-2 ring-white shadow" style={{ width: size, height: size }} />
    : <span className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-mist to-beige font-bold text-navy ring-2 ring-white shadow" style={{ width: size, height: size }}>{p.full_name.trim().charAt(0)}</span>;
}

export default function TreeView({ t, locale, people, edges, canEdit, canDelete }: {
  t: TreeT; locale: string; people: Person[]; edges: Edge[]; canEdit: boolean; canDelete: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const refresh = () => startTransition(() => router.refresh());
  const rtl = locale === "ar";
  const errs = t.errors as Record<string, string>;

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const wrap = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const justDragged = useRef(false);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);

  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const L = useMemo(() => layout(people, edges, collapsed), [people, edges, collapsed]);
  const W = L.width + 40, H = L.height + 40;
  // The canvas is laid out left-to-right; for Arabic the horizontal order is mirrored.
  const px = (x: number) => (rtl ? L.width - x - BOX.w : x) + 20;
  const py = (y: number) => y + 20;
  const pos = useMemo(() => new Map(L.nodes.map((n) => [n.id, n])), [L]);

  function fit() {
    const el = wrap.current; if (!el) return;
    const k = Math.min(1, el.clientWidth / W, el.clientHeight / H);
    setView({ k, x: (el.clientWidth - W * k) / 2, y: Math.max(8, (el.clientHeight - H * k) / 2) });
  }
  useEffect(() => { fit(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [people.length === 0]);

  const hits = useMemo(() => searchPeople(people, q).slice(0, 8), [people, q]);
  function reveal(id: string) {
    const anc = ancestors(id, edges);
    setCollapsed((c) => { const n = new Set(c); anc.forEach((a) => n.delete(a)); return n; });
    setSel(id); setQ("");
  }

  /** Zooms around a point (container coordinates); defaults to the centre of the canvas. */
  function zoom(f: number, cx?: number, cy?: number) {
    const el = wrap.current;
    const ox = cx ?? (el ? el.clientWidth / 2 : 0), oy = cy ?? (el ? el.clientHeight / 2 : 0);
    setView((v) => {
      const k = Math.min(2.5, Math.max(0.15, v.k * f)), r = k / v.k;
      return { k, x: ox - (ox - v.x) * r, y: oy - (oy - v.y) * r };
    });
  }
  // Ctrl/Cmd + mouse wheel zooms. Registered natively (non-passive) so the browser page does not zoom too.
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);
  const person = sel ? byId.get(sel) ?? null : null;
  useEffect(() => { if (sel && !byId.has(sel)) setSel(null); }, [byId, sel]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <div className="relative ms-auto min-w-[10rem] flex-1 md:max-w-xs">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} className={input} />
          {hits.length > 0 && (
            <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-mist bg-white shadow">
              {hits.map((h) => <li key={h.id}><button onClick={() => reveal(h.id)} className="block w-full px-3 py-2 text-start text-sm hover:bg-mist">{h.full_name}</button></li>)}
            </ul>
          )}
        </div>
        {canEdit && <AddRoot t={t} errs={errs} onDone={(id) => { refresh(); if (id) setSel(id); }} />}
      </div>

      <div ref={wrap} className={`relative h-[72vh] touch-none select-none overflow-hidden rounded-3xl border border-mist ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{ backgroundColor: "#faf7f0", backgroundImage: "radial-gradient(#d8cfb8 1px, transparent 1px)", backgroundSize: "22px 22px" }}
        onPointerDown={(e) => {
          if (e.button !== 0 || (e.target as HTMLElement).closest("button[data-stop]")) return;
          drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current; if (!d) return;
          const dx = e.clientX - d.x, dy = e.clientY - d.y;
          if (!d.moved && Math.hypot(dx, dy) < 5) return;
          if (!d.moved) { d.moved = true; setDragging(true); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }
          setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy }));
        }}
        onPointerUp={() => { justDragged.current = !!drag.current?.moved; drag.current = null; setDragging(false); setTimeout(() => { justDragged.current = false; }, 0); }}
        onPointerCancel={() => { drag.current = null; setDragging(false); }}
        onClickCapture={(e) => { if (justDragged.current) { e.stopPropagation(); e.preventDefault(); } }}>
        {people.length === 0 ? (
          <p className="grid h-full place-items-center p-6 text-center opacity-70">{t.noPeople}</p>
        ) : (
          <div dir="ltr" className="absolute start-0 top-0 origin-top-left" style={{ width: W, height: H, transform: `translate(${view.x}px,${view.y}px) scale(${view.k})`, left: 0 }}>
            <svg width={W} height={H} className="pointer-events-none absolute inset-0">
              {L.edges.map((e) => {
                const a = pos.get(e.from)!, b = pos.get(e.to)!;
                const x1 = px(a.x) + BOX.w / 2, y1 = py(a.y) + BOX.h, x2 = px(b.x) + BOX.w / 2, y2 = py(b.y), ym = y1 + BOX.gapY / 2;
                return <path key={e.from + e.to} d={`M${x1} ${y1}C${x1} ${ym},${x2} ${ym},${x2} ${y2}`} fill="none" stroke="#c4a35a" strokeOpacity={0.55} strokeWidth={2} strokeLinecap="round" />;
              })}
            </svg>
            {L.nodes.map((n) => {
              const p = byId.get(n.id); if (!p) return null;
              const on = sel === n.id;
              return (
                <div key={n.id} data-node className="absolute" style={{ left: px(n.x), top: py(n.y), width: BOX.w, height: BOX.h }}>
                  <button dir={rtl ? "rtl" : "ltr"} onClick={() => setSel(n.id)}
                    className={`group relative flex h-full w-full items-center gap-3 overflow-hidden rounded-2xl bg-white/90 px-3 text-start shadow-[0_6px_18px_-8px_rgba(20,30,60,0.35)] ring-1 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-8px_rgba(20,30,60,0.45)] ${on ? "ring-2 ring-gold" : "ring-mist"}`}>
                    <span className="absolute inset-y-0 start-0 w-1.5" style={{ background: ["#1f3a5f", "#c4a35a", "#4f7a6a", "#a35d5d", "#6b5b95"][(n.y / (BOX.h + BOX.gapY)) % 5] }} />
                    <span className="ms-1.5"><Avatar p={p} size={44} /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-bold leading-tight">{p.full_name}</span>
                      <span className="mt-0.5 block truncate text-xs opacity-60">{p.occupation || " "}</span></span>
                  </button>
                  {n.hasChildren && (
                    <button aria-label={n.collapsed ? t.expand : t.collapse} title={n.collapsed ? t.expand : t.collapse}
                      onClick={() => setCollapsed((c) => { const s = new Set(c); if (s.has(n.id)) s.delete(n.id); else s.add(n.id); return s; })}
                      data-stop className="absolute -bottom-3 left-1/2 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full bg-navy text-xs font-bold text-beige shadow">{n.collapsed ? "+" : "−"}</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="absolute bottom-3 end-3 flex flex-col overflow-hidden rounded-2xl bg-white/90 shadow ring-1 ring-mist backdrop-blur">
          <button data-stop className="px-3.5 py-2 text-lg hover:bg-mist" onClick={() => zoom(1.2)} aria-label={t.zoomIn} title={t.zoomIn}>+</button>
          <button data-stop className="border-y border-mist px-3.5 py-2 text-lg hover:bg-mist" onClick={() => zoom(1 / 1.2)} aria-label={t.zoomOut} title={t.zoomOut}>−</button>
          <button data-stop className="px-3.5 py-2 hover:bg-mist" onClick={fit} aria-label={t.fit} title={t.fit}>⤢</button>
        </div>
      </div>

      {person && (
        <Panel key={person.id} t={t} errs={errs} p={person} byId={byId} edges={edges} canEdit={canEdit} canDelete={canDelete}
          onClose={() => setSel(null)} onChanged={refresh} onSelect={setSel} />
      )}
    </div>
  );
}

function AddRoot({ t, errs, onDone }: { t: TreeT; errs: Record<string, string>; onDone: (id?: string) => void }) {
  const [open, setOpen] = useState(false);
  return open
    ? <NameForm t={t} errs={errs} submit={(n) => addPerson(null, n)} onDone={(id) => { setOpen(false); onDone(id); }} onCancel={() => setOpen(false)} />
    : <button className="rounded-xl bg-navy px-3 py-2 text-sm font-semibold text-beige" onClick={() => setOpen(true)}>{t.addRoot}</button>;
}

function NameForm({ t, errs, submit, onDone, onCancel }: {
  t: TreeT; errs: Record<string, string>; submit: (name: string) => Promise<{ error?: string; id?: string }>; onDone: (id?: string) => void; onCancel: () => void;
}) {
  const [name, setName] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    const r = await submit(name);
    setBusy(false);
    if (r.error) setErr(errs[r.error] ?? errs.generic); else onDone(r.id);
  }
  return (
    <form onSubmit={go} className="flex flex-wrap items-center gap-2">
      <input autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder={t.newName} className={`${input} w-48`} maxLength={120} />
      <button disabled={busy} className="rounded-xl bg-navy px-3 py-2 text-sm font-semibold text-beige disabled:opacity-60">{busy ? t.saving : t.add}</button>
      <button type="button" onClick={onCancel} className={btn}>{t.cancel}</button>
      {err && <span className="w-full text-sm text-red-700">{err}</span>}
    </form>
  );
}

function Panel({ t, errs, p, byId, edges, canEdit, canDelete, onClose, onChanged, onSelect }: {
  t: TreeT; errs: Record<string, string>; p: Person; byId: Map<string, Person>; edges: Edge[]; canEdit: boolean; canDelete: boolean;
  onClose: () => void; onChanged: () => void; onSelect: (id: string | null) => void;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "child" | "sibling" | "parent" | "delete">("view");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const parentId = edges.find((e) => e.child === p.id)?.parent ?? null;
  const parent = parentId ? byId.get(parentId) : null;
  const kids = edges.filter((e) => e.parent === p.id).map((e) => byId.get(e.child)).filter(Boolean) as Person[];
  const branchCount = descendantsCount(p.id, edges) + 1;
  const map = mapsLink(p), wa = whatsappLink(p.phone), age = ageOf(p.birth_date, p.death_date);
  const fail = (code?: string) => setErr(errs[code ?? "generic"] ?? errs.generic);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setErr(null);
    const raw = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    const r = await updatePerson(p.id, raw); setBusy(false);
    if (r.error) return fail(r.error);
    setMode("view"); onChanged();
  }
  async function photo(file: File | undefined) {
    if (!file) return;
    setBusy(true); setErr(null);
    const small = await shrink(file);
    const up = await uploadToDrive(small, "profiles");
    if (!up.ok) { setBusy(false); return fail(up.error === "forbidden" ? "forbidden_upload" : up.error); }
    const r = await setPhoto(p.id, up.fileId); setBusy(false);
    if (r.error) return fail(r.error);
    onChanged();
  }
  async function removePhoto() {
    setBusy(true); const r = await setPhoto(p.id, null); setBusy(false);
    if (r.error) return fail(r.error); onChanged();
  }
  async function remove(modeD: "reattach" | "branch") {
    setBusy(true); setErr(null);
    const r = await deletePerson(p.id, modeD); setBusy(false);
    if (r.error) return fail(r.error);
    onSelect(null); onChanged();
  }
  const added = (id?: string) => { setMode("view"); onChanged(); if (id) onSelect(id); };

  const field = "block space-y-1 text-sm";
  const row = (label: string, value: React.ReactNode) => (
    <div><dt className="text-xs opacity-60">{label}</dt><dd className="break-words">{value || <span className="opacity-40">{t.empty}</span>}</dd></div>
  );

  return (
    <aside role="dialog" aria-label={p.full_name}
      className="fixed z-40 overflow-y-auto border-mist bg-white p-4 shadow-2xl max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[85vh] max-md:rounded-t-2xl max-md:border-t md:inset-y-0 md:end-0 md:w-96 md:border-s">
      <div className="mb-3 flex items-start gap-3">
        <Avatar p={p} size={72} />
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-xl font-bold">{p.full_name}</h2>
          {p.occupation && <p className="text-sm opacity-70">{p.occupation}</p>}
        </div>
        <button onClick={onClose} aria-label={t.close} className={btn}>✕</button>
      </div>

      {err && <p className="mb-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</p>}
      {busy && <p className="mb-2 text-xs opacity-60">{t.saving}</p>}

      {mode === "view" && (
        <>
          <dl className="space-y-3">
            {row(t.birth, p.birth_date && <span dir="ltr">{p.birth_date}{age !== null && <span className="opacity-60"> · {age} {t.years}</span>}</span>)}
            {p.death_date && row(t.death, <span dir="ltr">{p.death_date}</span>)}
            {row(t.phone, p.phone && (
              <span className="flex flex-wrap items-center gap-2"><span dir="ltr">{p.phone}</span>
                <a className="text-gold underline" href={`tel:${p.phone.replace(/[^\d+]/g, "")}`}>{t.call}</a>
                {wa && <a className="text-gold underline" href={wa} target="_blank" rel="noopener noreferrer">{t.whatsapp}</a>}</span>))}
            {row(t.address, p.address && (
              <span className="block">{p.address}{map && <> <a className="text-gold underline" href={map} target="_blank" rel="noopener noreferrer">{t.openMap}</a></>}</span>))}
            {!p.address && map && row(t.mapsUrl, <a className="text-gold underline" href={map} target="_blank" rel="noopener noreferrer">{t.openMap}</a>)}
            {p.notes && row(t.notes, <span className="whitespace-pre-wrap">{p.notes}</span>)}
            {parent && row("↑", <button className="underline" onClick={() => onSelect(parent.id)}>{parent.full_name}</button>)}
            {kids.length > 0 && row("↓", <span className="flex flex-wrap gap-x-3">{kids.map((k) => <button key={k.id} className="underline" onClick={() => onSelect(k.id)}>{k.full_name}</button>)}</span>)}
          </dl>
          {canEdit ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button className={btn} onClick={() => setMode("edit")}>{t.edit}</button>
              <button className={btn} onClick={() => setMode("child")}>{t.addChild}</button>
              {parentId && <button className={btn} onClick={() => setMode("sibling")}>{t.addSibling}</button>}
              <button className={btn} onClick={() => setMode("parent")}>{t.addParent}</button>
              {canDelete && <button className={`${btn} text-red-700`} onClick={() => setMode("delete")}>{t.delete}</button>}
            </div>
          ) : <p className="mt-4 text-xs opacity-60">{t.readOnly}</p>}
        </>
      )}

      {mode === "edit" && (
        <form onSubmit={save} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className={`${btn} cursor-pointer`}>{p.photo ? t.changePhoto : t.photo}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="hidden" onChange={(e) => photo(e.target.files?.[0])} /></label>
            {p.photo && <button type="button" className={`${btn} text-red-700`} onClick={removePhoto}>{t.removePhoto}</button>}
          </div>
          <label className={field}>{t.name}<input name="full_name" required maxLength={120} defaultValue={p.full_name} className={input} /></label>
          <label className={field}>{t.occupation}<input name="occupation" maxLength={120} defaultValue={p.occupation ?? ""} className={input} /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className={field}>{t.birth}<input name="birth_date" type="date" defaultValue={p.birth_date ?? ""} className={input} /></label>
            <label className={field}>{t.death}<input name="death_date" type="date" defaultValue={p.death_date ?? ""} className={input} /></label>
          </div>
          <label className={field}>{t.phone}<input name="phone" dir="ltr" inputMode="tel" maxLength={30} defaultValue={p.phone ?? ""} className={input} /></label>
          <label className={field}>{t.address}<textarea name="address" rows={2} maxLength={300} defaultValue={p.address ?? ""} className={input} /></label>
          <label className={field}>{t.mapsUrl}<input name="maps_url" dir="ltr" type="url" placeholder="https://maps.app.goo.gl/…" defaultValue={p.maps_url ?? ""} className={input} />
            <span className="text-xs opacity-60">{t.mapsHint}</span></label>
          <label className={field}>{t.notes}<textarea name="notes" rows={3} maxLength={2000} defaultValue={p.notes ?? ""} className={input} /></label>
          <div className="flex gap-2">
            <button disabled={busy} className="flex-1 rounded-xl bg-navy py-2 font-semibold text-beige disabled:opacity-60">{busy ? t.saving : t.save}</button>
            <button type="button" className={btn} onClick={() => { setMode("view"); setErr(null); }}>{t.cancel}</button>
          </div>
        </form>
      )}

      {mode === "child" && <NameForm t={t} errs={errs} submit={(n) => addPerson(p.id, n)} onDone={added} onCancel={() => setMode("view")} />}
      {mode === "sibling" && parentId && <NameForm t={t} errs={errs} submit={(n) => addPerson(parentId, n)} onDone={added} onCancel={() => setMode("view")} />}
      {mode === "parent" && <NameForm t={t} errs={errs} submit={(n) => addParent(p.id, n)} onDone={added} onCancel={() => setMode("view")} />}

      {mode === "delete" && (
        <div className="space-y-2">
          <p className="font-semibold text-red-700">{t.deleteConfirm.replace("%s", p.full_name)}</p>
          {kids.length === 0 ? (
            <button disabled={busy} onClick={() => remove("branch")} className="w-full rounded-xl bg-red-700 py-2 font-semibold text-white disabled:opacity-60">{t.deleteSure}</button>
          ) : (
            <>
              {parentId && <button disabled={busy} onClick={() => remove("reattach")} className="w-full rounded-xl border border-red-700 py-2 text-sm text-red-700 disabled:opacity-60">{t.deleteOnly}</button>}
              <button disabled={busy} onClick={() => remove("branch")} className="w-full rounded-xl bg-red-700 py-2 text-sm font-semibold text-white disabled:opacity-60">{t.deleteBranch.replace("%n", String(branchCount))}</button>
            </>
          )}
          <button className={`${btn} w-full`} onClick={() => setMode("view")}>{t.cancel}</button>
        </div>
      )}
    </aside>
  );
}
