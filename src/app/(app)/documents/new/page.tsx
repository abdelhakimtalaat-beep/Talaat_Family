import { redirect } from "next/navigation";
import { getSession, getT, getLocale, allows } from "@/lib/session";
import { categoriesForScope } from "@/lib/villa-docs";
import DocumentForm from "../DocumentForm";

export default async function NewDocumentPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!allows(s.levels.documents, "update")) redirect("/documents");
  const t = await getT();
  const locale = await getLocale();
  const [{ data: cats }, { data: members }] = await Promise.all([
    s.supabase.from("document_categories").select("id,slug,name_ar,name_en").order("id"),
    s.supabase.from("family_members").select("id,full_name").order("full_name"),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.docs.add}</h1>
      <DocumentForm
        t={t.docs}
        scope="family"
        categories={categoriesForScope(cats ?? [], "family").map((c) => ({ id: c.id, slug: c.slug, label: locale === "ar" ? c.name_ar : c.name_en }))}
        members={(members ?? []).map((m) => ({ id: m.id, label: m.full_name }))}
      />
    </div>
  );
}
