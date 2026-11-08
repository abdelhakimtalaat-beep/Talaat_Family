import { redirect } from "next/navigation";
import { getSession, getT, getLocale, allows } from "@/lib/session";
import type { Edge, Person } from "@/lib/tree";
import TreeView from "./TreeView";

export default async function TreePage() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!allows(s.levels.tree, "view")) redirect("/");
  const t = await getT();
  const locale = await getLocale();

  const [m, r] = await Promise.all([
    s.supabase.from("family_members")
      .select("id,full_name,occupation,birth_date,death_date,phone,address,maps_url,notes,photo_drive_file_id").order("created_at").limit(2000),
    s.supabase.from("family_relationships").select("member_a,member_b,position").eq("kind", "parent_of").limit(5000),
  ]);
  const people: Person[] = (m.data ?? []).map((p) => ({
    id: p.id, full_name: p.full_name, occupation: p.occupation, birth_date: p.birth_date, death_date: p.death_date,
    phone: p.phone, address: p.address, maps_url: p.maps_url, notes: p.notes,
    photo: p.photo_drive_file_id ? `/api/drive/file/${p.photo_drive_file_id}` : null,
  }));
  const edges: Edge[] = (r.data ?? []).map((e) => ({ parent: e.member_a, child: e.member_b, position: e.position }));
  const canEdit = allows(s.levels.tree, "update") || allows(s.levels.directory, "update");
  const canDelete = allows(s.levels.tree, "full") || allows(s.levels.directory, "full");

  return <TreeView t={t.tree} locale={locale} people={people} edges={edges} canEdit={canEdit} canDelete={canDelete} />;
}
