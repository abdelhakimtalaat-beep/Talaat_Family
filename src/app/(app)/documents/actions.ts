"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession, allows } from "@/lib/session";

type Result = { error: string } | void;

async function requireUpdate() {
  const s = await getSession();
  if (!s || !allows(s.levels.documents, "update")) return null;
  return s;
}

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
  const s = await requireUpdate();
  if (!s) return { error: "forbidden" };
  const f = fields(fd);
  const fileId = str(fd, "file_id");
  if (!f || !fileId) return { error: "invalid" };
  const { data, error } = await s.supabase.from("documents")
    .insert({ ...f, file_id: fileId, uploaded_by: s.profile.id }).select("id").single();
  if (error) return { error: "generic" };
  revalidatePath("/documents");
  redirect(`/documents/${data.id}`);
}

export async function updateDocument(id: string, fd: FormData): Promise<Result> {
  const s = await requireUpdate();
  if (!s) return { error: "forbidden" };
  const f = fields(fd);
  if (!f) return { error: "invalid" };
  // The change (old and new values) is recorded by the audit trigger.
  const { error } = await s.supabase.from("documents").update(f).eq("id", id);
  if (error) return { error: "generic" };
  revalidatePath("/documents");
  redirect(`/documents/${id}`);
}

export async function replaceFile(id: string, fileId: string): Promise<Result> {
  const s = await requireUpdate();
  if (!s) return { error: "forbidden" };
  const { error } = await s.supabase.rpc("replace_document_file", { p_document: id, p_new_file: fileId });
  if (error) return { error: "generic" };
  revalidatePath(`/documents/${id}`);
}

export async function archiveDocument(id: string): Promise<Result> {
  const s = await requireUpdate();
  if (!s) return { error: "forbidden" };
  const { error } = await s.supabase.from("documents").update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: "generic" };
  revalidatePath("/documents");
  redirect("/documents");
}
