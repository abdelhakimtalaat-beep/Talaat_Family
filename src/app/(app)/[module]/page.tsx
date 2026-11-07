import { notFound, redirect } from "next/navigation";
import { getSession, getT, allows, type Module } from "@/lib/session";

const PHASE: Partial<Record<Module, string>> = {
  documents: "Phase 2", photos: "Phase 2", directory: "Phase 2", tree: "Phase 3", calendar: "Phase 3",
  villa: "Phase 4", maintenance: "Phase 4", finance: "Phase 5", users: "Phase 1 (next)", settings: "Phase 6",
};

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  const t = await getT();
  if (!(module in t.nav)) notFound();
  const m = module as Module;
  const s = await getSession();
  if (!s) redirect("/login");
  if (!allows(s.levels[m], "view")) redirect("/");
  return (
    <div className="card">
      <h1 className="mb-2 text-2xl font-bold">{t.nav[m]}</h1>
      <p className="text-sm opacity-70">Scheduled for {PHASE[m] ?? "a later phase"}.</p>
    </div>
  );
}
