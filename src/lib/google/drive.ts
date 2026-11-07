// Server-only Google Drive helpers (plain REST, no SDK). Never import from client components.
import { adminClient } from "@/lib/supabase/admin";
import { decrypt, encrypt } from "./crypto";
import type { Module } from "@/lib/session";

// drive.file: the app can only see files and folders it created itself, not the rest of the Drive.
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const API = "https://www.googleapis.com/drive/v3";

export class DriveAuthError extends Error {}

/** Folder layout requested in the brief. */
export const FOLDER_TREE: { key: string; name: string; parent?: string }[] = [
  { key: "root", name: "Family Hub" },
  { key: "documents", name: "Documents", parent: "root" },
  { key: "photos", name: "Family Photos", parent: "root" },
  { key: "events", name: "Family Events", parent: "root" },
  { key: "albums", name: "Personal Albums", parent: "root" },
  { key: "villa", name: "Villa", parent: "root" },
  { key: "villa_exterior", name: "Exterior", parent: "villa" },
  { key: "villa_interior", name: "Interior", parent: "villa" },
  { key: "villa_maintenance", name: "Maintenance", parent: "villa" },
  { key: "villa_renovation", name: "Renovation", parent: "villa" },
  { key: "villa_receipts", name: "Receipts", parent: "villa" },
  { key: "backups", name: "Backups", parent: "root" },
];

/** Which module permission (any one, at "update" level) allows uploading into each folder. */
export const UPLOAD_TARGETS: Record<string, Module[]> = {
  documents: ["documents"],
  photos: ["photos"],
  events: ["photos", "calendar"],
  albums: ["photos"],
  villa_exterior: ["villa"],
  villa_interior: ["villa"],
  villa_maintenance: ["maintenance", "villa"],
  villa_renovation: ["maintenance", "villa"],
  villa_receipts: ["finance", "maintenance", "villa"],
};

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
export const ALLOWED_MIME = [
  /^image\/(jpeg|png|webp|heic|heif|gif)$/,
  /^application\/pdf$/,
  /^text\/plain$/,
  /^application\/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet)$/,
  /^application\/(msword|vnd\.ms-excel)$/,
];

// ---------- Connection row ----------
export async function getConnection() {
  const { data, error } = await adminClient().from("drive_connection").select("*").eq("id", 1).single();
  if (error) throw error;
  return data as {
    account_email: string | null; refresh_token_enc: string | null; folders: Record<string, string>;
    status: "disconnected" | "connected" | "needs_reconnect";
    connected_at: string | null; last_sync_at: string | null; last_error: string | null;
    last_backup_at: string | null; last_backup_status: string | null;
  };
}

async function markNeedsReconnect(message: string) {
  await adminClient().from("drive_connection").update({ status: "needs_reconnect", last_error: message }).eq("id", 1);
}

// ---------- OAuth ----------
export function buildAuthUrl(state: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",   // needed to receive a refresh token
    prompt: "consent",        // forces a refresh token even on re-connect
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      ...body,
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    if (json.error === "invalid_grant") {
      await markNeedsReconnect("Google rejected the stored token (revoked or expired). Reconnect the account.");
      throw new DriveAuthError("invalid_grant");
    }
    throw new Error(`Google token error: ${json.error ?? res.status}`);
  }
  return json as { access_token: string; expires_in: number; refresh_token?: string };
}

export async function exchangeCode(code: string) {
  return tokenRequest({ code, grant_type: "authorization_code", redirect_uri: process.env.GOOGLE_REDIRECT_URI! });
}

// Short-lived access token cache (per server instance). Falls back to a refresh when expired.
let cached: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  const conn = await getConnection();
  if (conn.status !== "connected" || !conn.refresh_token_enc) throw new DriveAuthError("not_connected");
  const t = await tokenRequest({ refresh_token: decrypt(conn.refresh_token_enc), grant_type: "refresh_token" });
  cached = { token: t.access_token, expiresAt: Date.now() + t.expires_in * 1000 };
  return t.access_token;
}

export async function saveConnection(refreshToken: string, accessToken: string, userId: string) {
  let email: string | null = null;
  try {
    const r = await fetch(`${API}/about?fields=user(emailAddress)`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (r.ok) email = (await r.json()).user?.emailAddress ?? null;
  } catch { /* email is informational only */ }
  cached = null;
  await adminClient().from("drive_connection").update({
    refresh_token_enc: encrypt(refreshToken), account_email: email, status: "connected",
    connected_by: userId, connected_at: new Date().toISOString(), last_error: null,
  }).eq("id", 1);
}

export async function disconnect() {
  const conn = await getConnection();
  if (conn.refresh_token_enc) {
    try {
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: decrypt(conn.refresh_token_enc) }),
      });
    } catch { /* best effort */ }
  }
  cached = null;
  await adminClient().from("drive_connection")
    .update({ refresh_token_enc: null, status: "disconnected", account_email: null }).eq("id", 1);
}

// ---------- Drive operations ----------
async function driveFetch(path: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  const res = await fetch(path.startsWith("http") ? path : `${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });
  if (res.status === 401) { cached = null; throw new DriveAuthError("unauthorized"); }
  return res;
}

async function createFolder(name: string, parentId?: string): Promise<string> {
  const res = await driveFetch("/files?fields=id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", ...(parentId ? { parents: [parentId] } : {}) }),
  });
  if (!res.ok) throw new Error(`Could not create folder "${name}" (${res.status})`);
  return (await res.json()).id;
}

/** Creates any missing folders from FOLDER_TREE. Safe to run repeatedly. */
export async function ensureFolders() {
  const conn = await getConnection();
  const folders = { ...conn.folders };
  for (const f of FOLDER_TREE) {
    if (folders[f.key]) continue;
    folders[f.key] = await createFolder(f.name, f.parent ? folders[f.parent] : undefined);
    // Persist after each folder so a mid-way failure never creates duplicates on retry.
    await adminClient().from("drive_connection").update({ folders }).eq("id", 1);
  }
  await adminClient().from("drive_connection")
    .update({ last_sync_at: new Date().toISOString(), last_error: null }).eq("id", 1);
  return folders;
}

/**
 * Starts a resumable upload and returns the session URL. The browser uploads the bytes
 * straight to Google, so Vercel's request-size limit never applies. Passing the page's
 * Origin lets that browser PUT pass Google's CORS check. The session URL is single-use
 * and tied to this file name and folder.
 */
export async function startResumableUpload(opts: { name: string; mimeType: string; size: number; parentId: string; origin: string }) {
  const res = await driveFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": opts.mimeType,
      "X-Upload-Content-Length": String(opts.size),
      Origin: opts.origin,
    },
    body: JSON.stringify({ name: opts.name, parents: [opts.parentId] }),
  });
  const url = res.headers.get("location");
  if (!res.ok || !url) throw new Error(`Could not start upload (${res.status})`);
  return url;
}

/** Uploads a small file (a few MB at most) in one request. Used for database backups. */
export async function uploadSmallFile(opts: { name: string; mimeType: string; content: string; parentId: string }) {
  const boundary = `fh${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  const meta = JSON.stringify({ name: opts.name, parents: [opts.parentId] });
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
    `--${boundary}\r\nContent-Type: ${opts.mimeType}\r\n\r\n${opts.content}\r\n--${boundary}--`;
  const res = await driveFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!res.ok) throw new Error(`Backup upload failed (${res.status})`);
  return (await res.json()).id as string;
}

/** Files this app created inside a folder, newest first. */
export async function listFolderFiles(parentId: string) {
  const q = encodeURIComponent(`'${parentId}' in parents and trashed = false`);
  const res = await driveFetch(`/files?q=${q}&orderBy=createdTime%20desc&fields=files(id,name)&pageSize=200`);
  if (!res.ok) throw new Error(`Could not list folder (${res.status})`);
  return ((await res.json()).files ?? []) as { id: string; name: string }[];
}

export async function deleteFile(id: string) {
  const res = await driveFetch(`/files/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`Could not delete file (${res.status})`);
}

export async function getFileMeta(id: string) {
  const res = await driveFetch(`/files/${encodeURIComponent(id)}?fields=id,name,mimeType,size,parents,trashed`);
  if (!res.ok) return null;
  return (await res.json()) as { id: string; name: string; mimeType: string; size?: string; parents?: string[]; trashed?: boolean };
}

/** Streams file bytes to the caller. The Drive URL is never exposed; only this server can read it. */
export async function downloadFile(id: string, range?: string | null) {
  return driveFetch(`/files/${encodeURIComponent(id)}?alt=media`, range ? { headers: { Range: range } } : {});
}
