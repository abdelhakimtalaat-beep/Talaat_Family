import { Fragment } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession, getT, getLocale, allows } from "@/lib/session";
import { expiryState } from "@/lib/documents";
import { ArchiveButton, ReplaceFile } from "../DocActions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const badge = { expired: "bg-red-100 text-red-800", soon: "bg-amber-100 text-amber-800", ok: "bg-green-100 text-green-800", none: "bg-mist text-navy" };

export default async function DocumentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const s = await getSession();
  if (!s) redirect("/login");
  if (!allows(s.levels.documents, "view")) redirect("/");
  const t = await getT();
  const locale = await getLocale();
  const d = t.docs;

  // Row Level Security hides sensitive documents the user may not see: they simply come back empty.
  const { data: doc } = await s.supabase
    .from("documents")
    .select("*, category:document_categories(name_ar,name_en), member:family_members(full_name), file:google_drive_files!documents_file_id_fkey(id,name,mime_type,size_bytes), uploader:profiles!documents_uploaded_by_fkey(full_name)")
    .eq("id", id).is("archived_at", null).maybeSingle();
  if (!doc) notFound();

  const { data: versions } = await s.supabase
    .from("document_versions")
    .select("id,version,created_at,file:google_drive_files(id,name)")
    .eq("document_id", id).order("version", { ascending: false });

  const canEdit = allows(s.levels.documents, "update");
  const today = new Date().toISOString().slice(0, 10);
  const st = expiryState(doc.expiry_date, today, doc.remind_days);
  const mime: string = doc.file?.mime_type ?? "";
  const src = doc.file ? `/api/drive/file/${doc.file.id}` : null;
  const when = (v: string) => new Date(v).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB");

  const rows: [string, React.ReactNode][] = [
    [d.category, locale === "ar" ? doc.category?.name_ar : doc.category?.name_en],
    [d.member, doc.member?.full_name ?? "—"],
    [d.number, <span dir="ltr" key="n">{doc.document_number ?? "—"}</span>],
    [d.authority, doc.issuing_authority ?? "—"],
    [d.issued, <span dir="ltr" key="i">{doc.issue_date ?? "—"}</span>],
    [d.expires, <span dir="ltr" key="e">{doc.expiry_date ?? "—"}</span>],
    [d.uploadedBy, doc.uploader?.full_name ?? "—"],
    [d.uploadedAt, when(doc.created_at)],
    [d.version, doc.version],
  ];

  return (
    <div className="space-y-4">
      <Link href="/documents" className="text-sm underline">{d.back}</Link>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">{doc.title}{doc.is_sensitive && " 🔒"}</h1>
        <span className={`rounded-full px-2 py-0.5 text-xs ${badge[st]}`}>{d.state[st]}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card space-y-2">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {rows.map(([k, v]) => (
              <Fragment key={k}><dt className="opacity-60">{k}</dt><dd>{v}</dd></Fragment>
            ))}
          </dl>
          {doc.notes && <p className="whitespace-pre-wrap border-t border-mist pt-2 text-sm">{doc.notes}</p>}
          <div className="flex flex-wrap gap-2 border-t border-mist pt-3">
            {src && <a href={`${src}?download=1`} className="rounded-xl bg-navy px-3 py-1.5 text-sm text-beige">{d.download}</a>}
            {canEdit && <Link href={`/documents/${id}/edit`} className="rounded-xl border border-navy px-3 py-1.5 text-sm hover:bg-beige">{d.edit}</Link>}
            {canEdit && <ReplaceFile id={id} t={d} />}
            {canEdit && <ArchiveButton id={id} t={d} />}
          </div>
        </section>

        <section className="card min-h-64">
          <h2 className="mb-2 font-semibold">{d.preview}</h2>
          {src && mime.startsWith("image/") && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={doc.title} className="max-h-[70vh] w-full rounded-xl object-contain" />
          )}
          {src && mime === "application/pdf" && <iframe src={src} title={doc.title} className="h-[70vh] w-full rounded-xl border border-mist" />}
          {(!src || !(mime.startsWith("image/") || mime === "application/pdf")) && <p className="text-sm opacity-70">{d.noPreview}</p>}
        </section>
      </div>

      <section className="card">
        <h2 className="mb-2 font-semibold">{d.history}</h2>
        <ul className="space-y-1 text-sm">
          <li className="flex justify-between"><span>{d.version} {doc.version} · {d.current}</span><span className="opacity-70">{doc.file?.name}</span></li>
          {versions?.map((v: any) => (
            <li key={v.id} className="flex justify-between border-t border-mist pt-1">
              <a className="underline" href={`/api/drive/file/${v.file.id}?download=1`}>{d.version} {v.version}</a>
              <span className="opacity-70">{when(v.created_at)} · {v.file.name}</span>
            </li>
          ))}
          {!versions?.length && <li className="opacity-60">{d.noHistory}</li>}
        </ul>
      </section>
    </div>
  );
}
