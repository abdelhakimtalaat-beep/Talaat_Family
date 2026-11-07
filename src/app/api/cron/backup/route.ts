import { NextResponse } from "next/server";
import { isCronRequest } from "@/lib/cron-auth";
import { adminClient } from "@/lib/supabase/admin";
import { BACKUP_TABLES } from "@/lib/backup-tables";
import { deleteFile, ensureFolders, getConnection, listFolderFiles, uploadSmallFile } from "@/lib/google/drive";

export const maxDuration = 60;
const KEEP = 12; // newest backups to keep (about 3 months of weekly backups)
const PAGE = 1000;

async function status(ok: boolean, text: string) {
  await adminClient().from("drive_connection")
    .update({ last_backup_at: new Date().toISOString(), last_backup_status: ok ? "ok" : text.slice(0, 200) }).eq("id", 1);
}

// Weekly: exports the database tables to a JSON file in the family Drive ("Family Hub/Backups").
export async function GET(req: Request) {
  if (!isCronRequest(req)) return new NextResponse("Unauthorized", { status: 401 });
  try {
    const conn = await getConnection();
    if (conn.status !== "connected") {
      await status(false, "Drive not connected");
      return NextResponse.json({ ok: false, error: "drive_not_connected" }, { status: 503 });
    }
    const folders = await ensureFolders(); // also creates "Backups" on older installs
    const db = adminClient();

    const tables: Record<string, unknown[]> = {};
    for (const { table, order } of BACKUP_TABLES) {
      const rows: unknown[] = [];
      for (let from = 0; ; from += PAGE) {
        let q = db.from(table).select("*");
        for (const col of order) q = q.order(col);
        const { data, error } = await q.range(from, from + PAGE - 1);
        if (error) throw new Error(`${table}: ${error.message}`);
        rows.push(...(data ?? []));
        if (!data || data.length < PAGE) break;
      }
      tables[table] = rows;
    }

    const now = new Date();
    await uploadSmallFile({
      name: `familyhub-backup-${now.toISOString().slice(0, 10)}.json`,
      mimeType: "application/json",
      content: JSON.stringify({ format: 1, created_at: now.toISOString(), tables }),
      parentId: folders.backups,
    });

    // Retention: remove the oldest backups beyond KEEP.
    const files = await listFolderFiles(folders.backups);
    for (const f of files.slice(KEEP)) await deleteFile(f.id);

    await status(true, "ok");
    return NextResponse.json({ ok: true, tables: Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length])) });
  } catch (e) {
    await status(false, e instanceof Error ? e.message : "backup failed").catch(() => {});
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
