-- 0009: spouses in the family tree (stored as spouse_of in family_relationships).

-- A "married-in" person has a spouse but no parent in the tree. Children are always attached to the
-- partner who is in the tree, so a married-in spouse never owns children.
create or replace function tree_anchor(p_id uuid) returns uuid language sql stable as $$
  select case
    when exists (select 1 from family_relationships where member_b = p_id and kind = 'parent_of') then p_id
    else coalesce((select r.member_a from family_relationships r where r.kind = 'spouse_of' and r.member_b = p_id limit 1), p_id)
  end
$$;

create or replace function add_tree_person(p_parent uuid, p_name text) returns uuid
language plpgsql as $$
declare new_id uuid; pos int; par uuid;
begin
  par := case when p_parent is null then null else tree_anchor(p_parent) end;
  insert into family_members(full_name) values (btrim(p_name)) returning id into new_id;
  if par is not null then
    select coalesce(max(position) + 1, 0) into pos from family_relationships where member_a = par and kind = 'parent_of';
    insert into family_relationships(member_a, member_b, kind, position) values (par, new_id, 'parent_of', pos);
  end if;
  return new_id;
end $$;

create or replace function add_tree_spouse(p_person uuid, p_name text) returns uuid
language plpgsql as $$
declare new_id uuid;
begin
  if not exists (select 1 from family_members where id = p_person) then raise exception 'not_found'; end if;
  insert into family_members(full_name) values (btrim(p_name)) returning id into new_id;
  insert into family_relationships(member_a, member_b, kind) values (p_person, new_id, 'spouse_of');
  return new_id;
end $$;

create or replace function delete_tree_person(p_id uuid, p_mode text) returns int
language plpgsql as $$
declare par uuid; pos int; n int;
begin
  if p_mode = 'branch' then
    create temp table _del(id uuid) on commit drop;
    with recursive d(id) as (
      select p_id union select r.member_b from family_relationships r join d on r.member_a = d.id and r.kind = 'parent_of'
    ) insert into _del select id from d;
    -- married-in spouses (second side of a spouse link, with no parent of their own) go with them
    insert into _del
      select distinct r.member_b from family_relationships r join _del d on d.id = r.member_a
      where r.kind = 'spouse_of'
        and not exists (select 1 from family_relationships x where x.kind = 'parent_of' and x.member_b = r.member_b)
        and r.member_b not in (select id from _del);
    delete from family_members where id in (select id from _del);
    get diagnostics n = row_count;
    drop table _del;
    return n;
  elsif p_mode = 'reattach' then
    select member_a, position into par, pos from family_relationships where member_b = p_id and kind = 'parent_of';
    delete from family_relationships where member_b = p_id and kind = 'parent_of';
    if par is not null then
      update family_relationships set member_a = par, position = coalesce(pos, 0) + position + 1
        where member_a = p_id and kind = 'parent_of';
    end if;
    delete from family_members where id = p_id;
    get diagnostics n = row_count;
    return n;
  end if;
  raise exception 'bad_mode';
end $$;
