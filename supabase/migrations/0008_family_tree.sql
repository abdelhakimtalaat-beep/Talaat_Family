-- 0008: interactive family tree.
-- The tree is stored as parent_of edges in family_relationships (one parent per person in this version).

alter table family_members
  add column if not exists occupation text,
  add column if not exists maps_url text;
alter table family_members drop constraint if exists family_members_maps_url_https;
alter table family_members add constraint family_members_maps_url_https
  check (maps_url is null or maps_url ~* '^https://');
alter table family_members drop constraint if exists family_members_name_len;
alter table family_members add constraint family_members_name_len
  check (char_length(btrim(full_name)) between 1 and 120);

-- photo_drive_file_id was uuid with no meaning; Drive ids are text.
alter table family_members drop column if exists photo_drive_file_id;
alter table family_members add column photo_drive_file_id text;

alter table family_relationships add column if not exists position int not null default 0;

-- A person has at most one parent in the tree.
create unique index if not exists family_one_parent
  on family_relationships(member_b) where kind = 'parent_of';
create index if not exists family_parent_idx on family_relationships(member_a) where kind = 'parent_of';

-- Tree viewers need to read people; tree editors need to write them.
do $$ declare p text; begin
  foreach p in array array['family_members_sel','family_members_ins','family_members_upd','family_members_del'] loop
    execute format('drop policy if exists %I on family_members', p);
  end loop;
end $$;
create policy family_members_sel on family_members for select using (can_view('directory') or can_view('tree'));
create policy family_members_ins on family_members for insert with check (can_update('directory') or can_update('tree'));
create policy family_members_upd on family_members for update
  using (can_update('directory') or can_update('tree')) with check (can_update('directory') or can_update('tree'));
create policy family_members_del on family_members for delete using (can_full('directory') or can_full('tree'));

-- No cycles: a person cannot become the parent of their own ancestor.
create or replace function prevent_tree_cycle() returns trigger language plpgsql as $$
begin
  if new.kind = 'parent_of' then
    if exists (
      with recursive anc(id) as (
        select new.member_a
        union
        select r.member_a from family_relationships r join anc on r.member_b = anc.id and r.kind = 'parent_of'
      ) select 1 from anc where id = new.member_b
    ) then
      raise exception 'tree_cycle';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_tree_cycle on family_relationships;
create trigger trg_tree_cycle before insert or update on family_relationships
  for each row execute function prevent_tree_cycle();

-- Adds a person (optionally under a parent) at the end of the siblings.
create or replace function add_tree_person(p_parent uuid, p_name text) returns uuid
language plpgsql as $$
declare new_id uuid; pos int;
begin
  insert into family_members(full_name) values (btrim(p_name)) returning id into new_id;
  if p_parent is not null then
    select coalesce(max(position) + 1, 0) into pos from family_relationships where member_a = p_parent and kind = 'parent_of';
    insert into family_relationships(member_a, member_b, kind, position) values (p_parent, new_id, 'parent_of', pos);
  end if;
  return new_id;
end $$;

-- Adds a new person as the parent of an existing person (who must currently have no parent,
-- or whose old parent becomes the new person's parent).
create or replace function add_tree_parent(p_child uuid, p_name text) returns uuid
language plpgsql as $$
declare new_id uuid; old_parent uuid; old_pos int;
begin
  select member_a, position into old_parent, old_pos from family_relationships where member_b = p_child and kind = 'parent_of';
  delete from family_relationships where member_b = p_child and kind = 'parent_of';
  insert into family_members(full_name) values (btrim(p_name)) returning id into new_id;
  if old_parent is not null then
    insert into family_relationships(member_a, member_b, kind, position) values (old_parent, new_id, 'parent_of', old_pos);
  end if;
  insert into family_relationships(member_a, member_b, kind, position) values (new_id, p_child, 'parent_of', 0);
  return new_id;
end $$;

-- p_mode 'reattach': children move up to the deleted person's parent. 'branch': the whole branch goes.
-- Returns how many people were deleted.
create or replace function delete_tree_person(p_id uuid, p_mode text) returns int
language plpgsql as $$
declare par uuid; pos int; n int;
begin
  if p_mode = 'branch' then
    with recursive d(id) as (
      select p_id union select r.member_b from family_relationships r join d on r.member_a = d.id and r.kind = 'parent_of'
    ) delete from family_members where id in (select id from d);
    get diagnostics n = row_count;
    return n;
  elsif p_mode = 'reattach' then
    select member_a, position into par, pos from family_relationships where member_b = p_id and kind = 'parent_of';
    delete from family_relationships where member_b = p_id and kind = 'parent_of';
    if par is null then
      -- deleting a root: its children become separate roots only if there is a single child to promote
      null;
    else
      update family_relationships set member_a = par, position = coalesce(pos, 0) + position + 1
        where member_a = p_id and kind = 'parent_of';
    end if;
    delete from family_members where id = p_id;
    get diagnostics n = row_count;
    return n;
  end if;
  raise exception 'bad_mode';
end $$;
