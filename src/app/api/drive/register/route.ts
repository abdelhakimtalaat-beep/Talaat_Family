import { NextResponse } from "next/server";
import { sessionForUpload } from "@/lib/google/access";
import { getConnection, getFileMeta } from "@/lib/google/drive";

// Step 2 of an upload: after the browser finished sending bytes to Google,
// verify the file really is where we expect and record its metadata (never the bytes).
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { driveFileId, folder } = body ?? {};
  if (typeof driveFileId !== "string" || typeof folder !== "string")
    return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const s = await sessionForUpload(folder);
  if (!s) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const conn = await getConnection();
  const meta = await getFileMeta(driveFileId).catch(() => null);
  // Must be inside the folder this user is allowed to upload to, and not in the trash.
  if (!meta || meta.trashed || !meta.parents?.includes(conn.folders[folder]))
    return NextResponse.json({ error: "file_not_found" }, { status: 404 });

  const { data: existing } = await s.supabase.from("google_drive_files").select("id").eq("drive_file_id", driveFileId).maybeSingle();
  if (existing) return NextResponse.json({ id: existing.id });

  // Inserted as the signed-in user, so Row Level Security still applies.
  const { data, error } = await s.supabase.from("google_drive_files").insert({
    drive_file_id: meta.id, name: meta.name, mime_type: meta.mimeType,
    size_bytes: meta.size ? Number(meta.size) : null, folder_path: folder, uploaded_by: s.profile.id,
  }).select("id").single();
  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
