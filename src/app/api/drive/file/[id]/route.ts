import { getSession } from "@/lib/session";
import { downloadFile } from "@/lib/google/drive";

/**
 * Serves a Drive file to a signed-in user who is allowed to see the record that uses it.
 * The file stays private in Drive; the browser only ever sees this app's URL.
 * Add ?download=1 to force a download instead of in-page preview.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSession();
  if (!s) return new Response("Unauthorized", { status: 401 });

  // Access = the user can see (through Row Level Security) a record that references this file,
  // or they uploaded it themselves and have not attached it yet.
  const sb = s.supabase;
  const { data: file } = await sb.from("google_drive_files").select("id, drive_file_id, name, mime_type, uploaded_by, folder_path").eq("id", id).maybeSingle();
  if (!file) return new Response("Not found", { status: 404 });

  let allowed = file.uploaded_by === s.profile.id;
  if (!allowed) {
    const checks = await Promise.all([
      sb.from("documents").select("id").eq("file_id", id).limit(1),
      sb.from("document_versions").select("id").eq("file_id", id).limit(1),
      sb.from("photos").select("id").eq("file_id", id).limit(1),
      sb.from("expenses").select("id").eq("receipt_file_id", id).limit(1),
      sb.from("family_members").select("id").eq("photo_drive_file_id", id).limit(1),
    ]);
    allowed = checks.some((c) => (c.data?.length ?? 0) > 0);
  }
  if (!allowed) return new Response("Forbidden", { status: 403 });

  try {
    const range = req.headers.get("range");
    const upstream = await downloadFile(file.drive_file_id, range);
    if (!upstream.ok && upstream.status !== 206) return new Response("File unavailable", { status: 502 });
    const download = new URL(req.url).searchParams.get("download") === "1";
    const headers = new Headers({
      "Content-Type": file.mime_type ?? "application/octet-stream",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      // Profile photos are small and shown many times; other files are never cached.
      "Cache-Control": file.folder_path === "profiles" ? "private, max-age=3600" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    for (const h of ["content-length", "content-range", "accept-ranges"]) {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return new Response("Drive unavailable", { status: 503 });
  }
}
