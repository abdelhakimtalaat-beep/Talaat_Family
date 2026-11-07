import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, getT, getLocale, allows } from "@/lib/session";
import { expiryState, sanitizeSearch } from "@/lib/documents";

type SP = { q?: string; cat?: string; member?: string; from?: string; to?: string; sort?: string };
const badge = { expired: "bg-red-100 text-red-800", soon: "bg-amber-100 text-amber-800", ok: "bg-green-100 text-green-800", none: "bg-mist text-navy" };

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!allows(s.levels.documents, "view")) redirect("/");
  const t = await getT();
  const locale = await getLocale();
  const d = t.docs;
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const isDate = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

  let query = s.supabase
    .from("documents")
    .select("id,title,expiry_date,remind_days,document_number,is_sensitive,created_at,category:document_categories(name_ar,name_en),member:family_members(full_name)")
    .is("archived_at", null)
    .limit(200);

  const q = sanitizeSearch(sp.q ?? "");
  if (q) query = query.or(`title.ilike.%${q}%,document_number.ilike.%${q}%,issuing_authority.ilike.%${q}%`);
  if (sp.cat && /^\d+$/.test(sp.cat)) query = query.eq("category_id", Number(sp.cat));
  if (sp.member && /^[0-9a-f-]{36}$/i.test(sp.member)) query = query.eq("member_id", sp.member);
  if (isDate(sp.from)) query = query.gte("issue_date", isDate(sp.from)!);
  if (isDate(sp.to)) query = query.lte("issue_date", isDate(sp.to)!);
  if (sp.sort === "expiry") query = query.not("expiry_date", "is", null).order("expiry_date");
  else if (sp.sort === "title") query = query.order("title");
  else query = query.order("created_at", { ascending: false });

  const [{ data: docs }, { data: cats }, { data: members }] = await Promise.all([
    query,
    s.supabase.from("document_categories").select("id,name_ar,name_en").order("id"),
    s.supabase.from("family_members").select("id,full_name").order("full_name"),
  ]);

  const catName = (c: any) => (locale === "ar" ? c?.name_ar : c?.name_en);
  const input = "rounded-xl border border-mist bg-white px-3 py-2 text-sm outline-none focus:border-gold";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t.nav.documents}</h1>
        {allows(s.levels.documents, "update") && (
          <Link href="/documents/new" className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-beige hover:bg-navy-700">{d.add}</Link>
        )}
      </div>

      <form className="card grid gap-2 md:grid-cols-4">
        <input name="q" defaultValue={sp.q} placeholder={d.search} className={`${input} md:col-span-2`} />
        <select name="cat" defaultValue={sp.cat ?? ""} className={input}>
          <option value="">{d.allCategories}</option>
          {cats?.map((c) => <option key={c.id} value={c.id}>{catName(c)}</option>)}
        </select>
        <select name="member" defaultValue={sp.member ?? ""} className={input}>
          <option value="">{d.allMembers}</option>
          {members?.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </select>
        <label className="text-xs opacity-70">{d.from}<input name="from" type="date" defaultValue={sp.from} className={`${input} mt-1 w-full`} /></label>
        <label className="text-xs opacity-70">{d.to}<input name="to" type="date" defaultValue={sp.to} className={`${input} mt-1 w-full`} /></label>
        <select name="sort" defaultValue={sp.sort ?? ""} className={input} aria-label={d.sort}>
          <option value="">{d.sortNew}</option><option value="expiry">{d.sortExpiry}</option><option value="title">{d.sortTitle}</option>
        </select>
        <div className="flex gap-2">
          <button className="flex-1 rounded-xl bg-navy px-3 py-2 text-sm text-beige">{d.filter}</button>
          <Link href="/documents" className="rounded-xl border border-mist px-3 py-2 text-sm">{d.reset}</Link>
        </div>
      </form>

      {docs?.length ? (
        <ul className="space-y-2">
          {docs.map((x: any) => {
            const st = expiryState(x.expiry_date, today, x.remind_days);
            return (
              <li key={x.id}>
                <Link href={`/documents/${x.id}`} className="card flex flex-wrap items-center justify-between gap-2 hover:border-gold">
                  <div>
                    <div className="font-semibold">{x.title}{x.is_sensitive && " 🔒"}</div>
                    <div className="text-xs opacity-70">
                      {catName(x.category)}{x.member?.full_name ? ` · ${x.member.full_name}` : ""}
                    </div>
                  </div>
                  <div className="text-end text-xs">
                    <span className={`rounded-full px-2 py-0.5 ${badge[st]}`}>{d.state[st]}</span>
                    {x.expiry_date && <div className="mt-1 opacity-70" dir="ltr">{x.expiry_date}</div>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="card text-sm opacity-70">{d.empty}</p>
      )}
    </div>
  );
}
