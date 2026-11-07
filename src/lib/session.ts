import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { dict, type Locale } from "./i18n";

export type Module =
  | "dashboard" | "documents" | "photos" | "directory" | "tree"
  | "villa" | "maintenance" | "finance" | "calendar" | "users" | "settings";
export type Level = "none" | "view" | "update" | "full";
const RANK: Record<Level, number> = { none: 0, view: 1, update: 2, full: 3 };

export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get("locale")?.value;
  return c === "en" ? "en" : "ar";
}
export async function getT() {
  return dict[await getLocale()];
}

/** UI-level mirror of the database's my_level(). RLS remains the real enforcement. */
export async function getSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("id, full_name, is_admin, role_id").eq("id", user.id).single();
  if (!profile) return null;
  const levels: Partial<Record<Module, Level>> = {};
  const mods = Object.keys(dict.en.nav) as Module[];
  if (profile.is_admin) mods.forEach((m) => (levels[m] = "full"));
  else {
    const [{ data: rp }, { data: up }] = await Promise.all([
      supabase.from("role_permissions").select("module, level").eq("role_id", profile.role_id),
      supabase.from("user_permissions").select("module, level").eq("user_id", user.id),
    ]);
    rp?.forEach((r) => (levels[r.module as Module] = r.level as Level));
    up?.forEach((r) => (levels[r.module as Module] = r.level as Level));
  }
  return { supabase, profile, levels };
}
export const allows = (l: Level | undefined, need: Level) => RANK[l ?? "none"] >= RANK[need];
