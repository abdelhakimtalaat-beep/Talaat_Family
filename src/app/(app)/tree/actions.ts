"use server";
import { revalidatePath } from "next/cache";
import { getSession, allows } from "@/lib/session";
import { validatePerson } from "@/lib/tree";

type Result = { error?: string; id?: string; deleted?: number };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function need(level: "update" | "full") {
  const s = await getSession();
  if (!s) return null;
  return allows(s.levels.tree, level) || allows(s.levels.directory, level) ? s : null;
}
// The database policies make the final decision on every query, whatever is checked here.
const done = () => { revalidatePath("/tree"); revalidatePath("/documents"); };

export async function addPerson(parentId: string | null, name: string): Promise<Result> {
  const s = await need("update");
  if (!s) return { error: "forbidden" };
  const v = validatePerson({ full_name: name });
  if (!v.ok) return { error: v.error };
  if (parentId !== null && !UUID.test(parentId)) return { error: "generic" };
  const { data, error } = await s.supabase.rpc("add_tree_person", { p_parent: parentId, p_name: v.value.full_name });
  if (error) return { error: "generic" };
  done();
  return { id: data as string };
}

export async function addParent(childId: string, name: string): Promise<Result> {
  const s = await need("update");
  if (!s) return { error: "forbidden" };
  const v = validatePerson({ full_name: name });
  if (!v.ok) return { error: v.error };
  if (!UUID.test(childId)) return { error: "generic" };
  const { data, error } = await s.supabase.rpc("add_tree_parent", { p_child: childId, p_name: v.value.full_name });
  if (error) return { error: "generic" };
  done();
  return { id: data as string };
}

export async function updatePerson(id: string, raw: Record<string, string>): Promise<Result> {
  const s = await need("update");
  if (!s) return { error: "forbidden" };
  if (!UUID.test(id)) return { error: "generic" };
  const v = validatePerson(raw);
  if (!v.ok) return { error: v.error };
  const { error } = await s.supabase.from("family_members").update(v.value).eq("id", id);
  if (error) return { error: "generic" };
  done();
  return {};
}

export async function setPhoto(id: string, fileId: string | null): Promise<Result> {
  const s = await need("update");
  if (!s) return { error: "forbidden" };
  if (!UUID.test(id) || (fileId !== null && !UUID.test(fileId))) return { error: "generic" };
  const { error } = await s.supabase.from("family_members").update({ photo_drive_file_id: fileId }).eq("id", id);
  if (error) return { error: "generic" };
  done();
  return {};
}

export async function deletePerson(id: string, mode: "reattach" | "branch"): Promise<Result> {
  const s = await need("full");
  if (!s) return { error: "forbidden" };
  if (!UUID.test(id) || (mode !== "reattach" && mode !== "branch")) return { error: "generic" };
  const { data, error } = await s.supabase.rpc("delete_tree_person", { p_id: id, p_mode: mode });
  if (error) return { error: error.code === "23503" ? "linked" : "generic" }; // foreign key: documents still point to this person
  done();
  return { deleted: data as number };
}
