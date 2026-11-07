// Restores app data from a backup file produced by /api/cron/backup.
//
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/restore-backup.mjs path/to/familyhub-backup-2026-11-07.json
//
// Safe to re-run: rows are upserted by primary key, nothing is deleted.
// Requires the same users to exist in Supabase Auth with the SAME ids
// (profiles reference auth.users). Restoring into a brand-new project means
// recreating users first; see README, "Backup and recovery".
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const file = process.argv[2];
if (!file) { console.error("Usage: node scripts/restore-backup.mjs <backup.json>"); process.exit(1); }
const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
if (!url || !key) { console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }

const backup = JSON.parse(readFileSync(file, "utf8"));
if (backup.format !== 1) { console.error("Unsupported backup format"); process.exit(1); }

// Same order as src/lib/backup-tables.ts (parents before children).
const ORDER = [
  "document_categories", "expense_categories", "roles", "role_permissions", "profiles", "user_permissions",
  "family_members", "family_relationships", "google_drive_files", "documents", "document_versions",
  "photo_albums", "photos", "photo_tags", "family_events", "properties", "villa_floors", "villa_spaces",
  "contractors", "renovation_projects", "renovation_tasks", "maintenance_records", "expenses",
  "expense_shares", "payments", "financial_settlements",
];
const CONFLICT = {
  role_permissions: "role_id,module", user_permissions: "user_id,module",
  photo_tags: "photo_id,tag", expense_shares: "expense_id,resident_id",
};

const db = createClient(url, key, { auth: { persistSession: false } });
for (const table of ORDER) {
  const rows = backup.tables[table] ?? [];
  if (!rows.length) { console.log(`${table}: 0`); continue; }
  // expense_shares must be sent in one request: shares of an expense are checked together.
  const size = table === "expense_shares" ? rows.length : 500;
  for (let i = 0; i < rows.length; i += size) {
    // document_versions is append-only (updates are blocked), so existing rows are skipped, not updated.
    const { error } = await db.from(table).upsert(rows.slice(i, i + size), {
      onConflict: CONFLICT[table],
      ignoreDuplicates: table === "document_versions",
    });
    if (error) { console.error(`${table}: FAILED - ${error.message}`); process.exit(1); }
  }
  console.log(`${table}: ${rows.length}`);
}
console.log("Restore finished.");
