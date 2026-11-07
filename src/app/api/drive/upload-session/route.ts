import { NextResponse } from "next/server";
import { sessionForUpload } from "@/lib/google/access";
import { ALLOWED_MIME, DriveAuthError, MAX_UPLOAD_BYTES, getConnection, startResumableUpload } from "@/lib/google/drive";

// Step 1 of an upload: checks permission, then returns a one-time Google upload URL.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { folder, name, mimeType, size } = body ?? {};
  if (typeof folder !== "string" || typeof name !== "string" || typeof mimeType !== "string" || typeof size !== "number")
    return NextResponse.json({ error: "bad_request" }, { status: 400 });

  if (!(await sessionForUpload(folder))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!ALLOWED_MIME.some((re) => re.test(mimeType))) return NextResponse.json({ error: "type_not_allowed" }, { status: 415 });
  if (size <= 0 || size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });

  try {
    const conn = await getConnection();
    const parentId = conn.folders[folder];
    if (conn.status !== "connected" || !parentId) return NextResponse.json({ error: "drive_unavailable" }, { status: 503 });
    const origin = req.headers.get("origin") ?? new URL(req.url).origin;
    const uploadUrl = await startResumableUpload({ name: name.slice(0, 200), mimeType, size, parentId, origin });
    return NextResponse.json({ uploadUrl });
  } catch (e) {
    // Records in the database keep working when Drive is down; only file features are affected.
    return NextResponse.json({ error: e instanceof DriveAuthError ? "needs_reconnect" : "drive_unavailable" }, { status: 503 });
  }
}
