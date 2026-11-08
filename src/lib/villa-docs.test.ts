import { describe, it, expect } from "vitest";
import { folderFor, categoriesForScope, GROUPS, VILLA_SLUGS } from "./villa-docs";

const cats = ["identity", "villa_legal", "property", "other", "villa_handover", "villa_license",
  "villa_drawing_arch", "villa_drawing_struct", "villa_drawing_mep"].map((slug) => ({ slug }));

describe("villa documents helpers", () => {
  it("routes drawings and other villa files to the right Drive folder", () => {
    expect(folderFor("villa", "villa_drawing_struct")).toBe("villa_drawings");
    expect(folderFor("villa", "villa_license")).toBe("villa_documents");
    expect(folderFor("family", "villa_drawing_arch")).toBe("documents");
  });
  it("shows only villa categories for villa and hides villa-only ones in the family archive", () => {
    expect(categoriesForScope(cats, "villa").map((c) => c.slug)).toEqual(VILLA_SLUGS);
    const fam = categoriesForScope(cats, "family").map((c) => c.slug);
    expect(fam).toEqual(["identity", "villa_legal", "property", "other"]);
  });
  it("every villa category belongs to exactly one display group", () => {
    const all = GROUPS.flatMap((g) => g.slugs).sort();
    expect(all).toEqual([...VILLA_SLUGS].sort());
  });
});
