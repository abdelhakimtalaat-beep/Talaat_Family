export type DocScope = "family" | "villa";

/** Categories that exist only for villa documents (hidden from the family archive form). */
export const VILLA_ONLY_SLUGS = ["villa_handover", "villa_license", "villa_drawing_arch", "villa_drawing_struct", "villa_drawing_mep"];
/** Categories offered when uploading a villa document. */
export const VILLA_SLUGS = ["villa_legal", "property", "villa_handover", "villa_license", "villa_drawing_arch", "villa_drawing_struct", "villa_drawing_mep", "other"];

export const GROUPS: { key: "legal" | "handoverLicense" | "drawings" | "other"; slugs: string[] }[] = [
  { key: "legal", slugs: ["villa_legal", "property"] },
  { key: "handoverLicense", slugs: ["villa_handover", "villa_license"] },
  { key: "drawings", slugs: ["villa_drawing_arch", "villa_drawing_struct", "villa_drawing_mep"] },
  { key: "other", slugs: ["other"] },
];

/** Quick-upload buttons on the villa page: label key -> category slug. */
export const QUICK: { key: "contract" | "handover" | "license" | "arch" | "struct"; slug: string }[] = [
  { key: "contract", slug: "villa_legal" },
  { key: "handover", slug: "villa_handover" },
  { key: "license", slug: "villa_license" },
  { key: "arch", slug: "villa_drawing_arch" },
  { key: "struct", slug: "villa_drawing_struct" },
];

/** Google Drive folder key a document is uploaded to. */
export function folderFor(scope: DocScope, slug: string | null | undefined): string {
  if (scope !== "villa") return "documents";
  return slug?.startsWith("villa_drawing") ? "villa_drawings" : "villa_documents";
}

export function categoriesForScope<T extends { slug: string }>(cats: T[], scope: DocScope): T[] {
  return scope === "villa"
    ? VILLA_SLUGS.map((s) => cats.find((c) => c.slug === s)).filter((c): c is T => !!c)
    : cats.filter((c) => !VILLA_ONLY_SLUGS.includes(c.slug));
}
