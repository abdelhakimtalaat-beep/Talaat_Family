-- Document versioning + per-document expiry reminder window.
alter table documents add column if not exists version int not null default 1;
alter table documents add column if not exists remind_days int not null default 30
  check (remind_days between 0 and 365);

-- Version history rows are append-only: nobody may edit or delete past versions.
create or replace function block_version_changes() returns trigger language plpgsql as $$
begin raise exception 'document_versions is append-only'; end $$;
create trigger document_versions_immutable before update or delete on document_versions
  for each row execute function block_version_changes();

-- Replace the file of a document atomically: the old file is kept as a version.
create or replace function replace_document_file(p_document uuid, p_new_file uuid)
returns int language plpgsql as $$
declare v_old uuid; v_ver int;
begin
  -- Runs as the caller, so RLS on documents applies (needs update on documents).
  select file_id, version into v_old, v_ver from documents where id = p_document for update;
  if not found then raise exception 'document not found or not accessible'; end if;
  if v_old is not null then
    insert into document_versions (document_id, file_id, version, changed_by)
    values (p_document, v_old, v_ver, auth.uid());
  end if;
  update documents set file_id = p_new_file, version = v_ver + 1 where id = p_document;
  return v_ver + 1;
end $$;
