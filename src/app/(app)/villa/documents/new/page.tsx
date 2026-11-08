import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, getT, getLocale, allows } from "@/lib/session";
import { categoriesForScope } from "@/lib/villa-docs";
import DocumentForm from "../../../documents/DocumentForm";

export default async function NewVillaDocumentPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!allows(s.levels.villa, "update")) redirect("/villa");
  const t = await getT();
  const locale = await getLocale();
  const { cat } = await searchParams;

  const [{ data: cats }, { data: members }] = await Promise.all([
    s.supabase.from("document_categories").select("id,slug,name_ar,name_en").order("id"),
    s.supabase.from("family_members").select("id,full_name").order("full_name"),
  ]);
  const villaCats = categoriesForScope(cats ?? [], "villa");
  const preselected = villaCats.find((c) => c.slug === cat)?.id;

  return (
    <div className="space-y-4">
      <Link href="/villa" className="text-sm underline">{t.docs.back}</Link>
      <h1 className="text-2xl font-bold">{t.villa.newTitle}</h1>
      <DocumentForm
        t={t.docs}
        scope="villa"
        defaultCategoryId={preselected}
        categories={villaCats.map((c) => ({ id: c.id, slug: c.slug, label: locale === "ar" ? c.name_ar : c.name_en }))}
        members={(members ?? []).map((m) => ({ id: m.id, label: m.full_name }))}
      />
    </div>
  );
}
