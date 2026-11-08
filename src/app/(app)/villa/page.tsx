import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, getT, getLocale, allows } from "@/lib/session";
import { expiryState } from "@/lib/documents";
import { GROUPS, QUICK } from "@/lib/villa-docs";

const badge = { expired: "bg-red-100 text-red-800", soon: "bg-amber-100 text-amber-800", ok: "bg-green-100 text-green-800", none: "bg-mist text-navy" };

export default async function VillaPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!allows(s.levels.villa, "view")) redirect("/");
  const t = await getT();
  const locale = await getLocale();
  const v = t.villa;
  const canUpload = allows(s.levels.villa, "update");
  const today = new Date().toISOString().slice(0, 10);

  const { data: docs } = await s.supabase
    .from("documents")
    .select("id,title,file_id,expiry_date,remind_days,is_sensitive,created_at,category:document_categories(slug,name_ar,name_en)")
    .eq("scope", "villa").is("archived_at", null)
    .order("created_at", { ascending: false }).limit(300);

  const catName = (c: any) => (locale === "ar" ? c?.name_ar : c?.name_en);
  const chip = "rounded-full border border-navy px-3 py-1 text-sm hover:bg-beige";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t.nav.villa}</h1>
        {canUpload && (
          <Link href="/villa/documents/new" className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-beige hover:bg-navy-700">
            {v.upload}
          </Link>
        )}
      </div>

      <section className="card space-y-3">
        <h2 className="font-semibold">{v.docsTitle}</h2>

        {canUpload && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm opacity-70">{v.quickTitle}:</span>
            {QUICK.map((q) => (
              <Link key={q.key} href={`/villa/documents/new?cat=${q.slug}`} className={chip}>+ {v.quick[q.key]}</Link>
            ))}
          </div>
        )}

        {GROUPS.map((g) => {
          const items = (docs ?? []).filter((d: any) => g.slugs.includes(d.category?.slug));
          return (
            <div key={g.key} className="space-y-1 border-t border-mist pt-3">
              <h3 className="text-sm font-semibold text-gold-600">{v.groups[g.key]} ({items.length})</h3>
              {items.length ? (
                <ul className="space-y-1">
                  {items.map((d: any) => {
                    const st = expiryState(d.expiry_date, today, d.remind_days);
                    return (
                      <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-2 py-1.5 hover:bg-beige-100">
                        <Link href={`/documents/${d.id}`} className="min-w-0 flex-1">
                          <span className="font-medium">{d.title}{d.is_sensitive && " 🔒"}</span>
                          <span className="ms-2 text-xs opacity-70">{catName(d.category)}</span>
                        </Link>
                        <div className="flex items-center gap-2 text-xs">
                          {d.expiry_date && <span className={`rounded-full px-2 py-0.5 ${badge[st]}`} dir="ltr">{d.expiry_date}</span>}
                          {d.file_id && <a href={`/api/drive/file/${d.file_id}?download=1`} className="underline">{v.download}</a>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm opacity-60">{v.empty}</p>
              )}
            </div>
          );
        })}
      </section>

      <p className="card text-sm opacity-70">{v.soon}</p>
    </div>
  );
}
