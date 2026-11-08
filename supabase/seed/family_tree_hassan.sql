-- Loads the family tree drawn in the original chart. Skipped if real people already exist.
do $$
begin
  if exists (select 1 from family_members where not is_sample) then
    raise notice 'family_members already has real data - seed skipped';
    return;
  end if;
  create temp table t(k int, pk int, pos int, name text, id uuid default gen_random_uuid()) on commit drop;
  insert into t(k,pk,pos,name) values
  (1,null,0,'حسن'),
  (2,1,0,'محمد طلعت'),(3,1,1,'نبيلة'),(4,1,2,'حسن'),(5,1,3,'سيد'),
  (6,5,0,'مصطفى'),
  (7,4,0,'أسماء'),(8,4,1,'إسراء'),(9,4,2,'عبيدة'),
  (10,3,0,'محمد'),(11,3,1,'سماح'),
  (12,2,0,'زينب'),(13,2,1,'فاطمة'),(14,2,2,'مختار'),(15,2,3,'عبدالحكيم'),
  (16,12,0,'البتول'),(17,12,1,'فاطمة الزهراء'),(18,12,2,'مريم'),
  (19,13,0,'محمد'),(20,13,1,'مريم'),
  (21,14,0,'محمد'),(22,14,1,'عبدالحكيم'),(23,14,2,'مختار'),
  (24,15,0,'رويدا'),(25,15,1,'مختار'),(26,15,2,'حسين');
  -- same names appear more than once and birth_date is null, so the unique(full_name,birth_date) is not hit (nulls differ)
  insert into family_members(id, full_name) select id, name from t;
  insert into family_relationships(member_a, member_b, kind, position)
    select p.id, c.id, 'parent_of', c.pos from t c join t p on p.k = c.pk;
end $$;
