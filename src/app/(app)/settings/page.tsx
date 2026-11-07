import { redirect } from "next/navigation";
import { getSession, getT, allows } from "@/lib/session";
import { getConnection, FOLDER_TREE } from "@/lib/google/drive";
import { disconnectDrive, initFolders } from "./actions";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ drive?: string }> }) {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!allows(s.levels.settings, "view")) redirect("/");
  const t = await getT();
  const d = t.drive;
  const { drive: flash } = await searchParams;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.nav.settings}</h1>
      {flash && flash in d.msg && (
        <p className="card text-sm">{d.msg[flash as keyof typeof d.msg]}</p>
      )}
      <section className="card space-y-3">
        <h2 className="font-semibold">{d.title}</h2>
        {s.profile.is_admin ? <DriveStatus /> : <p className="text-sm opacity-70">{d.adminOnly}</p>}
      </section>
    </div>
  );

  async function DriveStatus() {
    const c = await getConnection();
    const folderCount = FOLDER_TREE.filter((f) => c.folders[f.key]).length;
    const btn = "rounded-xl border border-navy px-3 py-1.5 text-sm hover:bg-beige";
    return (
      <>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="opacity-60">{d.status}</dt>
          <dd className={c.status === "connected" ? "text-green-800" : "text-red-700"}>{d[c.status]}</dd>
          <dt className="opacity-60">{d.account}</dt>
          <dd dir="ltr" className="text-start">{c.account_email ?? "—"}</dd>
          <dt className="opacity-60">Folders</dt>
          <dd>{folderCount} / {FOLDER_TREE.length}</dd>
          <dt className="opacity-60">{d.lastSync}</dt>
          <dd>{c.last_sync_at ? new Date(c.last_sync_at).toLocaleString("ar-EG") : d.never}</dd>
          <dt className="opacity-60">{d.lastBackup}</dt>
          <dd>{c.last_backup_at ? new Date(c.last_backup_at).toLocaleString("ar-EG") : d.never}</dd>
        </dl>
        {c.last_backup_status && c.last_backup_status !== "ok" && (
          <p className="text-sm text-red-700">{d.backupFailed}: {c.last_backup_status}</p>
        )}
        {c.last_error && <p className="text-sm text-red-700">{c.last_error}</p>}
        <div className="flex flex-wrap gap-2">
          <a href="/api/drive/connect" className={btn}>{c.status === "connected" ? d.reconnect : c.status === "needs_reconnect" ? d.reconnect : d.connect}</a>
          {c.status === "connected" && (
            <>
              <form action={initFolders}><button className={btn}>{d.initFolders}</button></form>
              <form action={disconnectDrive}><button className={btn}>{d.disconnect}</button></form>
            </>
          )}
        </div>
      </>
    );
  }
}
