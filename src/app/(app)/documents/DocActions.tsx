"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadToDrive } from "@/lib/google/upload-client";
import type { DocsT } from "@/lib/i18n";
import { archiveDocument, replaceFile } from "./actions";

const btn = "rounded-xl border border-navy px-3 py-1.5 text-sm hover:bg-beige disabled:opacity-60";

export function ReplaceFile({ id, t, folder = "documents" }: { id: string; t: DocsT; folder?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const errors = t.errors as Record<string, string>;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null); setBusy(true);
    const up = await uploadToDrive(file, folder);
    if (!up.ok) { setErr(errors[up.error] ?? errors.generic); setBusy(false); return; }
    const res = await replaceFile(id, up.fileId);
    if (res?.error) setErr(errors[res.error] ?? errors.generic);
    setBusy(false);
    e.target.value = "";
    router.refresh();
  }
  return (
    <div className="space-y-1">
      <label className={`${btn} inline-block cursor-pointer ${busy ? "opacity-60" : ""}`}>
        {busy ? t.saving : t.replace}
        <input type="file" hidden disabled={busy} onChange={onPick} accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx,.txt" />
      </label>
      {err && <p className="text-sm text-red-700">{err}</p>}
    </div>
  );
}

export function ArchiveButton({ id, t, backTo = "/documents" }: { id: string; t: DocsT; backTo?: string }) {
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="space-y-1">
      <button
        className={btn}
        onClick={async () => {
          if (!confirm) { setConfirm(true); return; }
          const res = await archiveDocument(id, backTo);
          if (res?.error) setErr((t.errors as Record<string, string>)[res.error] ?? t.errors.generic);
        }}
      >
        {confirm ? t.archiveConfirm : t.archive}
      </button>
      {err && <p className="text-sm text-red-700">{err}</p>}
    </div>
  );
}
