/**
 * Tables included in the weekly backup, in a foreign-key-safe order (also used by restore).
 * `order` gives a stable sort so paging never skips or repeats rows.
 * Not included on purpose: drive_connection (holds the encrypted Google token),
 * notifications (disposable), and auth users (managed by Supabase Auth, see README).
 */
export const BACKUP_TABLES: { table: string; order: string[] }[] = [
  { table: "document_categories", order: ["id"] },
  { table: "expense_categories", order: ["id"] },
  { table: "roles", order: ["id"] },
  { table: "role_permissions", order: ["role_id", "module"] },
  { table: "profiles", order: ["id"] },
  { table: "user_permissions", order: ["user_id", "module"] },
  { table: "family_members", order: ["id"] },
  { table: "family_relationships", order: ["id"] },
  { table: "google_drive_files", order: ["id"] },
  { table: "documents", order: ["id"] },
  { table: "document_versions", order: ["id"] },
  { table: "photo_albums", order: ["id"] },
  { table: "photos", order: ["id"] },
  { table: "photo_tags", order: ["photo_id", "tag"] },
  { table: "family_events", order: ["id"] },
  { table: "properties", order: ["id"] },
  { table: "villa_floors", order: ["id"] },
  { table: "villa_spaces", order: ["id"] },
  { table: "contractors", order: ["id"] },
  { table: "renovation_projects", order: ["id"] },
  { table: "renovation_tasks", order: ["id"] },
  { table: "maintenance_records", order: ["id"] },
  { table: "expenses", order: ["id"] },
  { table: "expense_shares", order: ["expense_id", "resident_id"] },
  { table: "payments", order: ["id"] },
  { table: "financial_settlements", order: ["id"] },
];
