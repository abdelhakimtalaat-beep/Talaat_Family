-- Single-row table holding the family Google Drive connection.
-- RLS is enabled with NO policies: browsers using the anon key can never read it.
-- Only server code using SUPABASE_SERVICE_ROLE_KEY touches this table.
create table drive_connection (
  id int primary key default 1 check (id = 1),
  account_email text,
  refresh_token_enc text,            -- AES-256-GCM encrypted, see src/lib/google/crypto.ts
  folders jsonb not null default '{}',   -- { root: "<driveId>", documents: "<driveId>", ... }
  status text not null default 'disconnected'
    check (status in ('disconnected','connected','needs_reconnect')),
  connected_by uuid references profiles(id),
  connected_at timestamptz,
  last_sync_at timestamptz,
  last_error text
);
alter table drive_connection enable row level security;
insert into drive_connection (id) values (1) on conflict do nothing;

-- Same file registered twice must not create two rows
create index if not exists google_drive_files_uploader_idx on google_drive_files (uploaded_by);
