import { getSession, getT, allows } from "@/lib/session";

const count = async (supabase: any, table: string) =>
  (await supabase.from(table).select("id", { count: "exact", head: true })).count ?? 0;

export default async function Dashboard() {
  const s = (await getSession())!;
  const t = await getT();
  const { supabase, levels } = s;
  const today = new Date().toISOString().slice(0, 10);
  const in60 = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10);

  // Each block is fetched only if the user can view that module; RLS also enforces this.
  const [members, docs, photos, albums, expiring, events, openTasks, balances, expenses] = await Promise.all([
    allows(levels.directory, "view") ? count(supabase, "family_members") : null,
    allows(levels.documents, "view") ? count(supabase, "documents") : null,
    allows(levels.photos, "view") ? count(supabase, "photos") : null,
    allows(levels.photos, "view") ? count(supabase, "photo_albums") : null,
    allows(levels.documents, "view")
      ? supabase.from("documents").select("id,title,expiry_date").gte("expiry_date", today).lte("expiry_date", in60).order("expiry_date").limit(5)
      : null,
    allows(levels.calendar, "view")
      ? supabase.from("family_events").select("id,title,event_date").gte("event_date", today).order("event_date").limit(5)
      : null,
    allows(levels.maintenance, "view")
      ? supabase.from("renovation_tasks").select("id", { count: "exact", head: true }).neq("status", "completed")
      : null,
    allows(levels.finance, "view") ? supabase.from("resident_balances").select("*") : null,
    allows(levels.finance, "view")
      ? supabase.from("expenses").select("total_amount").is("voided_at", null)
      : null,
  ]);

  const totalExpenses = expenses?.data?.reduce((a: number, e: any) => a + Number(e.total_amount), 0) ?? 0;
  const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

  const stats: [string, number | null][] = [
    [t.dash.members, members], [t.dash.documents, docs], [t.dash.photos, photos],
    [t.dash.albums, albums], [t.dash.openTasks, openTasks?.count ?? null],
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t.nav.dashboard}</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.filter(([, v]) => v !== null).map(([label, v]) => (
          <div key={label} className="card">
            <div className="text-3xl font-bold text-gold-600">{v}</div>
            <div className="text-sm opacity-70">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {expiring && (
          <section className="card">
            <h2 className="mb-2 font-semibold">{t.dash.expiring}</h2>
            {expiring.data?.length ? expiring.data.map((d: any) => (
              <div key={d.id} className="flex justify-between border-b border-mist py-1 text-sm last:border-0">
                <span>{d.title}</span><span className="opacity-70">{d.expiry_date}</span>
              </div>
            )) : <p className="text-sm opacity-60">{t.dash.none}</p>}
          </section>
        )}
        {events && (
          <section className="card">
            <h2 className="mb-2 font-semibold">{t.dash.events}</h2>
            {events.data?.length ? events.data.map((e: any) => (
              <div key={e.id} className="flex justify-between border-b border-mist py-1 text-sm last:border-0">
                <span>{e.title}</span><span className="opacity-70">{e.event_date}</span>
              </div>
            )) : <p className="text-sm opacity-60">{t.dash.none}</p>}
          </section>
        )}
        {balances && (
          <section className="card md:col-span-2">
            <h2 className="mb-1 font-semibold">{t.dash.balances}</h2>
            <p className="mb-2 text-sm opacity-70">{t.dash.totalExpenses}: {fmt(totalExpenses)} {t.dash.currency}</p>
            {balances.data?.map((b: any) => {
              const n = Number(b.net_balance);
              return (
                <div key={b.resident_id} className="flex justify-between border-b border-mist py-1 text-sm last:border-0">
                  <span>{b.full_name}</span>
                  <span className={n < 0 ? "text-red-700" : "text-green-800"}>
                    {n === 0 ? t.dash.settled : `${n > 0 ? t.dash.owed : t.dash.owes} ${fmt(Math.abs(n))} ${t.dash.currency}`}
                  </span>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}
