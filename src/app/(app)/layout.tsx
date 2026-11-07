import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, getT, allows, type Module } from "@/lib/session";
import { signOut, toggleLocale } from "../actions";

const ORDER: Module[] = [
  "dashboard", "documents", "photos", "directory", "tree", "villa",
  "maintenance", "finance", "calendar", "users", "settings",
];
const HREF: Record<Module, string> = {
  dashboard: "/", documents: "/documents", photos: "/photos", directory: "/directory",
  tree: "/tree", villa: "/villa", maintenance: "/maintenance", finance: "/finance",
  calendar: "/calendar", users: "/users", settings: "/settings",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const t = await getT();
  // Only show modules the user may at least view.
  const items = ORDER.filter((m) => allows(session.levels[m], "view"));

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-64 shrink-0 flex-col bg-navy p-4 text-beige md:flex">
        <div className="mb-6 text-xl font-bold text-gold">{t.appName}</div>
        <nav className="flex-1 space-y-1">
          {items.map((m) => (
            <Link key={m} href={HREF[m]} className="block rounded-xl px-3 py-2 hover:bg-navy-700">
              {t.nav[m]}
            </Link>
          ))}
        </nav>
        <div className="space-y-2 border-t border-navy-700 pt-3 text-sm">
          <div className="opacity-80">{session.profile.full_name}</div>
          <form action={toggleLocale}><button className="underline">{t.language}</button></form>
          <form action={signOut}><button className="underline">{t.signOut}</button></form>
        </div>
      </aside>

      <div className="flex-1 pb-20 md:pb-0">
        <header className="flex items-center justify-between bg-navy px-4 py-3 text-beige md:hidden">
          <span className="font-bold text-gold">{t.appName}</span>
          <form action={toggleLocale}><button className="text-sm underline">{t.language}</button></form>
        </header>
        <div className="mx-auto max-w-6xl p-4 md:p-8">{children}</div>
      </div>

      {/* Mobile bottom navigation: first 4 allowed modules + sign out */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-mist bg-white py-2 text-xs md:hidden">
        {items.slice(0, 4).map((m) => (
          <Link key={m} href={HREF[m]} className="px-2 py-1 text-center">{t.nav[m]}</Link>
        ))}
        <form action={signOut}><button className="px-2 py-1">{t.signOut}</button></form>
      </nav>
    </div>
  );
}
