alter table drive_connection add column if not exists last_backup_at timestamptz;
alter table drive_connection add column if not exists last_backup_status text;
