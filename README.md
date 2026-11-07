# Family Hub

Family and villa management app (Next.js + TypeScript, Supabase, Google Drive, Vercel).
Arabic RTL by default, English optional.

## Status: Phase 1 foundation + Google Drive layer + documents archive

| Done | Notes |
|---|---|
| Full PostgreSQL schema (all 28 planned entities) | `supabase/migrations/0001_schema.sql` |
| Row Level Security, per-module permissions, user overrides | `0002_rls_and_integrity.sql` |
| Audit trail on sensitive tables (append-only) | triggers in `0002` |
| Expense shares must total the expense (checked at commit); expenses and payments cannot be hard-deleted | `0002` |
| Resident balance ledger view | `resident_balances` in `0001` |
| Reference data: document and expense categories, roles | `0003_reference_data.sql` |
| Sample data (all flagged `is_sample`) and removal script | `supabase/seed/` |
| Login, session, middleware route protection | `src/app`, `src/middleware.ts` |
| Arabic/English with RTL/LTR switch | `src/lib/i18n.ts` |
| Permission-aware sidebar, mobile bottom nav, dashboard | `src/app/(app)` |
| Cost-sharing engine (equal, percentage, fixed, custom) with tests | `src/lib/finance/split.ts` |
| PWA manifest, security headers, `.env.example`, Vercel config | |

Not built yet: user invitation UI, documents, photos, Google Drive routes, directory, tree, villa, finance screens, reports, PWA icons/service worker. Module pages currently show a placeholder.

## Setup

1. **Install**: `npm install`
2. **Supabase**: create a project. In the SQL editor run, in order, `0001`, `0002`, `0003`. Optionally run `supabase/seed/sample_data.sql`.
3. **Env**: copy `.env.example` to `.env.local` and fill in the Supabase values (Project Settings > API).
4. **First admin**: in Supabase Auth > Users, add yourself (email + password). Then run:
   ```sql
   update profiles set is_admin = true, is_resident = true, full_name = 'Your name'
   where id = (select id from auth.users where email = 'you@example.com');
   ```
   Add your mother and sister as users the same way, then:
   ```sql
   update profiles set is_resident = true, role_id = (select id from roles where name = 'resident')
   where id in (select id from auth.users where email in ('mother@example.com','sister@example.com'));
   ```
5. **Icons**: add `public/icon-192.png` and `public/icon-512.png` for the PWA.
6. **Run**: `npm run dev`, and `npm test` for the finance engine tests.

## Google Drive setup (Phase 2)

All files (documents, photos, receipts) are stored only in the family Google Drive. Supabase holds only metadata and the Drive file ID; Supabase Storage is not used.

1. Run `supabase/migrations/0004_drive_connection.sql`.
2. In [Google Cloud Console](https://console.cloud.google.com), create a project and enable **Google Drive API**.
3. OAuth consent screen: user type External, add the family Google account as a test user, then set the publishing status to **In production**. In Testing mode Google expires refresh tokens after about 7 days. The only scope used is `drive.file`, which lets the app see only the files and folders it creates itself.
4. Credentials > Create OAuth client ID > Web application. Add redirect URIs `http://localhost:3000/api/drive/callback` and `https://YOUR-DOMAIN/api/drive/callback`.
5. Fill `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `SUPABASE_SERVICE_ROLE_KEY` and a random `TOKEN_ENCRYPTION_KEY` (32+ characters; `openssl rand -base64 32`).
6. Sign in as admin > Settings > **ربط حساب العائلة** and sign in with the family Google account. The `Family Hub/` folder tree is created automatically.

How it works:
- Upload: the browser asks `/api/drive/upload-session` (permission check), sends the bytes straight to Google (so Vercel's request-size limit does not apply), then calls `/api/drive/register` to store the metadata. Helper: `src/lib/google/upload-client.ts`.
- View/download: `/api/drive/file/<id>` checks that the user can see a record using that file (so sensitive-document rules apply), then streams it. Drive links are never shared and files are never public.
- The refresh token is stored AES-256-GCM encrypted in `drive_connection`, a table with no user-facing policies.
- If Drive is down or the token is revoked, database records keep working; the settings page shows "يلزم إعادة الربط".

Not done yet: file replacement and version history (comes with the documents screens), upload UI itself, and duplicate-photo detection.

## Documents archive (Phase 2)

Run `supabase/migrations/0005_documents_versions.sql` (adds `version`, `remind_days`, an append-only version history and the `replace_document_file` function).

Screens under `/documents`: list with search (title, number, authority), filters (category, person, issue-date range) and sorting; add document with direct upload to Drive; detail page with in-app preview (PDF and images), download, edit, archive; replace file, which keeps the old file as a numbered version; version history. Expiry badges (expired / soon / valid) use each document's own reminder window. Every edit, replacement and archive is captured by the audit trigger. Sensitive documents are enforced by the database policy, not just the UI.

Not done yet: email reminders for expiring documents (comes with the Calendar and Reminders phase) and import of existing files in bulk.

## Keep-alive and backups

Run `supabase/migrations/0006_backup_status.sql`. Set `CRON_SECRET` (random, 16+ characters) in Vercel. `vercel.json` then schedules two jobs; Vercel sends the secret itself and the routes reject any other caller.

- **Daily keep-alive** (`/api/cron/keepalive`, 06:00 UTC): one small database query, so the free Supabase project is not paused for inactivity. Supabase's documented rule is pausing after low activity over 7 days; a paused project can be resumed from its dashboard with data intact. Free-plan rules change, so recheck [Supabase's pausing page](https://supabase.com/docs/guides/platform/free-project-pausing) occasionally. Vercel's Hobby plan limits cron jobs to once a day, which is enough here.
- **Weekly backup** (`/api/cron/backup`, Sundays 03:00 UTC): exports the app tables to one JSON file in `Family Hub/Backups` on the family Google Drive and keeps the newest 12. The last result is shown in Settings. The backup contains personal and financial data, so it stays private in the same Drive. It deliberately leaves out the stored Google token.

### Backup and recovery

- Backups cover app data (people, documents, photos, expenses, villa, permissions). The files themselves live in Drive and are not copied.
- **Supabase Auth users are not in the backup.** Same project, data damaged: run the restore script, users are still there. New project: run migrations 0001-0006, then recreate users **with the same ids** (or send me the backup and I will add a user-mapping step), then restore.
- Restore: download a backup from Drive, then `NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/restore-backup.mjs familyhub-backup-YYYY-MM-DD.json`. It upserts in dependency order and deletes nothing. Test it once on a throwaway Supabase project before you need it.
- To test the cron jobs yourself after deploying: `curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://YOUR-DOMAIN/api/cron/keepalive` (and `/backup`).

## Deploy

1. Create a **private** GitHub repo and push (`.env*` is git-ignored).
2. In Vercel, import the repo, add the variables from `.env.example`, set the production branch to `main`. Every push to `main` then deploys automatically.
3. Add your domain under Vercel > Domains and set `NEXT_PUBLIC_APP_URL`.
4. In Supabase Auth settings, set the Site URL and redirect URLs to the production domain.

## Design notes

- Permissions: `profiles.is_admin` gets full access; otherwise a per-user override in `user_permissions` wins over the role default in `role_permissions`. Levels are none / view / update / full. Reads need view, writes need update, deletes need full. The UI checks the same rules, but the database is the enforcement point.
- Sensitive documents (`is_sensitive`) are readable only with full access to documents, or by the uploader.
- Money is computed in integer piastres, so shares always sum exactly to the total.
- Balance sign: positive means others owe that resident; negative means they owe others.
- Google tokens will live server-side only (Phase 2), refresh token encrypted with `TOKEN_ENCRYPTION_KEY`; `SUPABASE_SERVICE_ROLE_KEY` is never used in client code.

## Verification

The workspace this was written in had no network, so `npm install`, `next build` and the SQL migrations were **not run**. Only the finance engine was exercised (via Node type-stripping): the brief's 30,000 EGP example, rounding, percentage validation, ledger and settlement all pass. Expect to fix small type or syntax errors on first build, and run the SQL against a fresh Supabase project to confirm it applies cleanly.
