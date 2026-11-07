// Browser helper used by the documents / photos / receipts forms (next phases).
// Flow: ask our server for a one-time Google URL -> send the bytes straight to Google ->
// tell our server to record the metadata. Google credentials never reach the browser.

export type UploadResult = { ok: true; fileId: string } | { ok: false; error: string };

export async function uploadToDrive(
  file: File,
  folder: string,
  onProgress?: (pct: number) => void
): Promise<UploadResult> {
  const sess = await fetch("/api/drive/upload-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder, name: file.name, mimeType: file.type, size: file.size }),
  });
  if (!sess.ok) return { ok: false, error: (await sess.json().catch(() => ({}))).error ?? "upload_failed" };
  const { uploadUrl } = await sess.json();

  const driveFileId = await new Promise<string | null>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try { resolve(xhr.status < 300 ? JSON.parse(xhr.responseText).id : null); } catch { resolve(null); }
    };
    xhr.onerror = () => resolve(null);
    xhr.send(file);
  });
  if (!driveFileId) return { ok: false, error: "upload_failed" };

  const reg = await fetch("/api/drive/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ driveFileId, folder }),
  });
  if (!reg.ok) return { ok: false, error: (await reg.json().catch(() => ({}))).error ?? "register_failed" };
  return { ok: true, fileId: (await reg.json()).id };
}
