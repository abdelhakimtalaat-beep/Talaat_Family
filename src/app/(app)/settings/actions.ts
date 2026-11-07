"use server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { disconnect, ensureFolders } from "@/lib/google/drive";

async function requireAdmin() {
  const s = await getSession();
  if (!s?.profile.is_admin) redirect("/");
}

export async function initFolders() {
  await requireAdmin();
  try { await ensureFolders(); } catch { redirect("/settings?drive=error"); }
  redirect("/settings?drive=folders");
}

export async function disconnectDrive() {
  await requireAdmin();
  await disconnect();
  redirect("/settings");
}
