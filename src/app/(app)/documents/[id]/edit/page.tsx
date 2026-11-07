import { notFound, redirect } from "next/navigation";
import { getSession, getT, getLocale, allows } from "@/lib/session";
import DocumentForm from "../../DocumentForm";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const s = await getSession();
  if (!s) redirect("/login");
  if (!allows(s.levels.documents, "update")) redirect(`/documents/${id}`);
  const t = await getT();
  const locale = await getLocale();
  const [{ data: doc }, { data: cats }, { data: members }] = await Promise.all([
    s.supabase.from("documents")
      .select("id,title,category_id,member_id,document_number,issue_date,expiry_date,issuing_authority,notes,is_sensitive,remind_days")
      .eq("id", id).is("archived_at", null).maybeSingle(),
    s.supabase.from("document_categories").select("id,name_ar,name_en").order("id"),
    s.supabase.from("family_members").select("id,full_name").order("full_name"),
  ]);
  if (!doc) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.docs.edit}</h1>
      <DocumentForm
        t={t.docs} doc={doc}
        categories={(cats ?? []).map((c) => ({ id: c.id, label: locale === "ar" ? c.name_ar : c.name_en }))}
        members={(members ?? []).map((m) => ({ id: m.id, label: m.full_name }))}
      />
    </div>
  );
}
