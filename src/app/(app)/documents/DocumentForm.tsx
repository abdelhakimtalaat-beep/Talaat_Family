"use client";
import { useState } from "react";
import { uploadToDrive } from "@/lib/google/upload-client";
import { folderFor, type DocScope } from "@/lib/villa-docs";
import type { DocsT } from "@/lib/i18n";
import { createDocument, updateDocument } from "./actions";

type Opt = { id: string | number; label: string; slug?: string };
export type DocValues = {
  id: string; title: string; category_id: number; member_id: string | null; document_number: string | null;
  issue_date: string | null; expiry_date: string | null; issuing_authority: string | null; notes: string | null;
  is_sensitive: boolean; remind_days: number;
};

const input = "w-full rounded-xl border border-mist bg-warm px-3 py-2 outline-none focus:border-gold";

export default function DocumentForm({
  t, categories, members, doc, scope = "family", defaultCategoryId,
}: {
  t: DocsT; categories: Opt[]; members: Opt[]; doc?: DocValues; scope?: DocScope; defaultCategoryId?: number;
}) {
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const errors = t.errors as Record<string, string>;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file") as File | null;
    fd.delete("file");
    setBusy(true);
    if (!doc) {
      if (!file || file.size === 0) { setErr(t.fileRequired); setBusy(false); return; }
      const slug = categories.find((c) => String(c.id) === String(fd.get("category_id")))?.slug;
      const up = await uploadToDrive(file, folderFor(scope, slug), setPct);
      if (!up.ok) { setErr(errors[up.error] ?? errors.generic); setBusy(false); return; }
      fd.set("file_id", up.fileId);
    }
    fd.set("scope", scope);
    const res = doc ? await updateDocument(doc.id, fd) : await createDocument(fd);
    // On success the action redirects; we only get here with an error.
    if (res?.error) { setErr(errors[res.error] ?? errors.generic); setBusy(false); }
  }

  const label = "block space-y-1 text-sm";
  return (
    <form onSubmit={onSubmit} className="card grid gap-3 md:grid-cols-2">
      <label className={`${label} md:col-span-2`}>{t.title}
        <input name="title" required defaultValue={doc?.title} className={input} />
      </label>
      <label className={label}>{t.category}
        <select name="category_id" required defaultValue={doc?.category_id ?? defaultCategoryId ?? ""} className={input}>
          <option value="" disabled>—</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </label>
      <label className={label}>{t.member}
        <select name="member_id" defaultValue={doc?.member_id ?? ""} className={input}>
          <option value="">{t.noMember}</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </label>
      <label className={label}>{t.number}
        <input name="document_number" dir="ltr" defaultValue={doc?.document_number ?? ""} className={input} />
      </label>
      <label className={label}>{t.authority}
        <input name="issuing_authority" defaultValue={doc?.issuing_authority ?? ""} className={input} />
      </label>
      <label className={label}>{t.issued}
        <input name="issue_date" type="date" defaultValue={doc?.issue_date ?? ""} className={input} />
      </label>
      <label className={label}>{t.expires}
        <input name="expiry_date" type="date" defaultValue={doc?.expiry_date ?? ""} className={input} />
      </label>
      <label className={label}>{t.remind}
        <input name="remind_days" type="number" min={0} max={365} defaultValue={doc?.remind_days ?? 30} className={input} />
      </label>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input name="is_sensitive" type="checkbox" defaultChecked={doc?.is_sensitive} /> {t.sensitive}
      </label>
      <label className={`${label} md:col-span-2`}>{t.notes}
        <textarea name="notes" rows={3} defaultValue={doc?.notes ?? ""} className={input} />
      </label>
      {!doc && (
        <label className={`${label} md:col-span-2`}>{t.file}
          <input name="file" type="file" required accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx,.txt" className={input} />
        </label>
      )}
      {busy && !doc && pct > 0 && pct < 100 && (
        <div className="h-2 overflow-hidden rounded-full bg-mist md:col-span-2"><div className="h-full bg-gold" style={{ width: `${pct}%` }} /></div>
      )}
      {err && <p className="text-sm text-red-700 md:col-span-2">{err}</p>}
      <button disabled={busy} className="rounded-xl bg-navy py-2 font-semibold text-beige hover:bg-navy-700 disabled:opacity-60 md:col-span-2">
        {busy ? t.saving : t.save}
      </button>
    </form>
  );
}
