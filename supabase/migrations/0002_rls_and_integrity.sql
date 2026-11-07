-- Family Hub: Row Level Security, permission helpers, audit triggers, share validation

-- ---------- Permission helpers ----------
create or replace function level_rank(l access_level) returns int
language sql immutable as $$
  select case l when 'none' then 0 when 'view' then 1 when 'update' then 2 when 'full' then 3 end
$$;

-- Effective level: admin => full; user override wins; else role default.
create or replace function my_level(m app_module) returns access_level
language sql stable security definer set search_path = public as $$
  select case
    when p.is_admin then 'full'::access_level
    when not p.is_active then 'none'::access_level
    else coalesce(
      (select up.level from user_permissions up where up.user_id = p.id and up.module = m),
      (select rp.level from role_permissions rp where rp.role_id = p.role_id and rp.module = m),
      'none'::access_level)
  end
  from profiles p where p.id = auth.uid()
$$;

create or replace function can_view(m app_module) returns boolean
language sql stable as $$ select coalesce(level_rank(my_level(m)) >= 1, false) $$;
create or replace function can_update(m app_module) returns boolean
language sql stable as $$ select coalesce(level_rank(my_level(m)) >= 2, false) $$;
create or replace function can_full(m app_module) returns boolean
language sql stable as $$ select coalesce(level_rank(my_level(m)) >= 3, false) $$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin and is_active from profiles where id = auth.uid()), false)
$$;

-- ---------- Enable RLS everywhere ----------
do $$
declare t text;
begin
  for t in select unnest(array[
    'roles','role_permissions','profiles','user_permissions','family_members','family_relationships',
    'google_drive_files','document_categories','documents','document_versions','photo_albums','photos',
    'photo_tags','family_events','properties','villa_floors','villa_spaces','contractors',
    'renovation_projects','renovation_tasks','maintenance_records','expense_categories','expenses',
    'expense_shares','payments','financial_settlements','notifications','activity_logs'])
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- ---------- Identity / admin tables ----------
create policy profiles_self_or_users on profiles for select
  using (id = auth.uid() or can_view('users') or is_resident);
create policy profiles_admin_write on profiles for all
  using (is_admin()) with check (is_admin());
-- users may change only their own language via this narrow policy
create policy profiles_self_update on profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and is_admin = (select is_admin from profiles where id = auth.uid()));

create policy roles_read on roles for select using (auth.uid() is not null);
create policy roles_admin on roles for all using (is_admin()) with check (is_admin());
create policy rp_read on role_permissions for select using (auth.uid() is not null);
create policy rp_admin on role_permissions for all using (is_admin()) with check (is_admin());
create policy up_read on user_permissions for select using (user_id = auth.uid() or is_admin());
create policy up_admin on user_permissions for all using (is_admin()) with check (is_admin());

-- ---------- Generic per-module policies ----------
-- Pattern: select needs view, insert/update needs update, delete needs full.
create or replace function apply_module_policies(tbl text, m app_module) returns void
language plpgsql as $$
begin
  execute format('create policy %I on %I for select using (can_view(%L))', tbl||'_sel', tbl, m);
  execute format('create policy %I on %I for insert with check (can_update(%L))', tbl||'_ins', tbl, m);
  execute format('create policy %I on %I for update using (can_update(%L)) with check (can_update(%L))', tbl||'_upd', tbl, m, m);
  execute format('create policy %I on %I for delete using (can_full(%L))', tbl||'_del', tbl, m);
end $$;

select apply_module_policies('family_members','directory');
select apply_module_policies('family_relationships','tree');
select apply_module_policies('documents','documents');
select apply_module_policies('document_versions','documents');
select apply_module_policies('photo_albums','photos');
select apply_module_policies('photos','photos');
select apply_module_policies('photo_tags','photos');
select apply_module_policies('family_events','calendar');
select apply_module_policies('properties','villa');
select apply_module_policies('villa_floors','villa');
select apply_module_policies('villa_spaces','villa');
select apply_module_policies('contractors','villa');
select apply_module_policies('renovation_projects','maintenance');
select apply_module_policies('renovation_tasks','maintenance');
select apply_module_policies('maintenance_records','maintenance');
select apply_module_policies('expenses','finance');
select apply_module_policies('expense_shares','finance');
select apply_module_policies('payments','finance');

-- Sensitive documents: only 'full' on documents (or the uploader) may read them.
drop policy documents_sel on documents;
create policy documents_sel on documents for select
  using (can_view('documents') and (not is_sensitive or can_full('documents') or uploaded_by = auth.uid()));

-- Drive file references: visible to anyone who can see a document/photo/finance record.
create policy gdf_sel on google_drive_files for select
  using (can_view('documents') or can_view('photos') or can_view('villa') or can_view('finance') or can_view('maintenance'));
create policy gdf_ins on google_drive_files for insert
  with check (can_update('documents') or can_update('photos') or can_update('villa') or can_update('finance') or can_update('maintenance'));
create policy gdf_upd on google_drive_files for update
  using (can_update('documents') or can_update('photos') or can_update('villa') or can_update('finance'));

-- Lookup tables: read for all signed-in users, write for admin
create policy dc_read on document_categories for select using (auth.uid() is not null);
create policy dc_admin on document_categories for all using (is_admin()) with check (is_admin());
create policy ec_read on expense_categories for select using (auth.uid() is not null);
create policy ec_admin on expense_categories for all using (is_admin()) with check (is_admin());

-- Settlement snapshots: finance full only
create policy fs_sel on financial_settlements for select using (can_view('finance'));
create policy fs_ins on financial_settlements for insert with check (can_full('finance'));

-- Notifications: own only
create policy notif_own on notifications for select using (user_id = auth.uid());
create policy notif_mark on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Activity log: admin read only; written by triggers (security definer)
create policy al_admin on activity_logs for select using (is_admin());

-- ---------- Audit trail ----------
create or replace function audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into activity_logs (user_id, action, table_name, record_id, old_data, new_data)
  values (
    auth.uid(), lower(tg_op), tg_table_name,
    coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'id', ''),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'documents','photos','family_members','family_relationships','expenses','expense_shares',
    'payments','financial_settlements','maintenance_records','renovation_tasks',
    'user_permissions','role_permissions','profiles','family_events','villa_spaces'])
  loop
    execute format('create trigger %I after insert or update or delete on %I for each row execute function audit_row()', 'audit_'||t, t);
  end loop;
end $$;

-- Audit log is append-only, even for admins using the API.
create or replace function block_log_changes() returns trigger language plpgsql as $$
begin raise exception 'activity_logs is append-only'; end $$;
create trigger activity_logs_immutable before update or delete on activity_logs
  for each row execute function block_log_changes();

-- ---------- Financial integrity ----------
-- Shares must total the expense amount. Checked when the transaction commits
-- (deferred constraint trigger) so shares can be inserted after the expense.
create or replace function check_shares_total() returns trigger
language plpgsql as $$
declare v_total numeric; v_sum numeric; v_id uuid;
begin
  v_id := coalesce(new.expense_id, old.expense_id);
  select total_amount into v_total from expenses where id = v_id;
  if v_total is null then return null; end if;   -- expense deleted
  select coalesce(sum(share_amount),0) into v_sum from expense_shares where expense_id = v_id;
  if v_sum <> v_total then
    raise exception 'Shares (%) must equal expense total (%) for expense %', v_sum, v_total, v_id;
  end if;
  return null;
end $$;
create constraint trigger expense_shares_total
  after insert or update or delete on expense_shares
  deferrable initially deferred for each row execute function check_shares_total();

-- Expenses are never hard-deleted; void them instead (audit trail preserved).
create or replace function block_expense_delete() returns trigger language plpgsql as $$
begin raise exception 'Expenses cannot be deleted; set voided_at instead'; end $$;
create trigger expenses_no_delete before delete on expenses
  for each row execute function block_expense_delete();
create trigger payments_no_delete before delete on payments
  for each row execute function block_expense_delete();

-- Auto-create a profile when a user is invited / signs up
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
