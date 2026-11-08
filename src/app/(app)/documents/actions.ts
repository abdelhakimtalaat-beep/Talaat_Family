"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession, allows } from "@/lib/session";

type Result = { error: string } | undefined;

/** Family documents need "update" on documents; villa documents need "update" on villa. */
async function requireUpdate(scope: "family" | "villa" | "any" = "any") {
  const s = await getSession();
  if (!s) return null;
  const docs = allows(s.levels.documents, "update");
  const villa = allows(s.levels.villa, "update");
  const ok = scope === "family" ? docs : scope === "villa" ? villa : docs || villa;
  return ok ? s : null;
}
// The database policies make the final decision on every query, whatever is checked here.

const BACK_TARGETS = ["/documents", "/villa"];

const str = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
};
const date = (fd: FormData, k: string) => {
  const v = str(fd, k);
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
};

function fields(fd: FormData) {
  const title = str(fd, "title");
  const category = Number(fd.get("category_id"));
  const remind = Number(fd.get("remind_days") ?? 30);
  if (!title || !Number.isInteger(category) || category <= 0) return null;
  const issue = date(fd, "issue_date"), expiry = date(fd, "expiry_date");
  if (issue && expiry && expiry < issue) return null;
  return {
    title, category_id: category,
    member_id: str(fd, "member_id"),
    document_number: str(fd, "document_number"),
    issue_date: issue, expiry_date: expiry,
    issuing_authority: str(fd, "issuing_authority"),
    notes: str(fd, "notes"),
    is_sensitive: fd.get("is_sensitive") === "on",
    remind_days: Number.isInteger(remind) && remind >= 0 && remind <= 365 ? remind : 30,
  };
}

export async function createDocument(fd: FormData): Promise<Result> {
  const scope = fd.get("scope") === "villa" ? "villa" : "family";
  const s = await requireUpdate(scope);
  if (!s) return { error: "forbidden" };
  const f = fields(fd);
  const fileId = str(fd, "file_id");
  if (!f || !fileId) return { error: "invalid" };
  const { data, error } = await s.supabase.from("documents")
    .insert({ ...f, scope, file_id: fileId, uploaded_by: s.profile.id }).select("id").single();
  if (error) return { error: "generic" };
  revalidatePath("/documents");
  revalidatePath("/villa");
  redirect(scope === "villa" ? "/villa" : `/documents/${data.id}`);
}

export async function updateDocument(id: string, fd: FormData): Promise<Result> {
  const s = await requireUpdate();
  if (!s) return { error: "forbidden" };
  const f = fields(fd);
  if (!f) return { error: "invalid" };
  // The change (old and new values) is recorded by the audit trigger. `scope` is never changed here.
  const { error } = await s.supabase.from("documents").update(f).eq("id", id);
  if (error) return { error: "generic" };
  revalidatePath("/documents");
  revalidatePath("/villa");
  redirect(`/documents/${id}`);
}

export async function replaceFile(id: string, fileId: string): Promise<Result> {
  const s = await requireUpdate();
  if (!s) return { error: "forbidden" };
  const { error } = await s.supabase.rpc("replace_document_file", { p_document: id, p_new_file: fileId });
  if (error) return { error: "generic" };
  revalidatePath(`/documents/${id}`);
  return undefined;
}

export async function archiveDocument(id: string, backTo: string = "/documents"): Promise<Result> {
  const s = await requireUpdate();
  if (!s) return { error: "forbidden" };
  const { error } = await s.supabase.from("documents").update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: "generic" };
  revalidatePath("/documents");
  revalidatePath("/villa");
  redirect(BACK_TARGETS.includes(backTo) ? backTo : "/documents");
}
