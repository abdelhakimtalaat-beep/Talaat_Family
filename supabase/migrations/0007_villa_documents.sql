-- Villa documents: stored in the same `documents` table, but governed by the VILLA module
-- permission instead of the family-archive (documents) permission.

alter table documents add column if not exists scope text not null default 'family'
  check (scope in ('family','villa'));
create index if not exists documents_scope_idx on documents (scope);

insert into document_categories (slug, name_ar, name_en) values
 ('villa_handover','محضر استلام الفيلا','Villa handover report'),
 ('villa_license','تراخيص الفيلا','Villa licenses & permits'),
 ('villa_drawing_arch','مخططات معمارية','Architectural drawings'),
 ('villa_drawing_struct','مخططات إنشائية','Structural drawings'),
 ('villa_drawing_mep','مخططات كهربائية وميكانيكية','MEP drawings')
on conflict do nothing;

-- Which module permission applies to a document, based on its scope.
create or replace function doc_module(s text) returns app_module
language sql immutable as $$
  select case when s = 'villa' then 'villa'::app_module else 'documents'::app_module end
$$;
create or replace function can_doc_view(s text) returns boolean
language sql stable as $$ select can_view(doc_module(s)) $$;
create or replace function can_doc_update(s text) returns boolean
language sql stable as $$ select can_update(doc_module(s)) $$;
create or replace function can_doc_full(s text) returns boolean
language sql stable as $$ select can_full(doc_module(s)) $$;

-- Replace the document policies from 0002 with scope-aware ones.
drop policy if exists documents_sel on documents;
drop policy if exists documents_ins on documents;
drop policy if exists documents_upd on documents;
drop policy if exists documents_del on documents;

create policy documents_sel on documents for select
  using (can_doc_view(scope) and (not is_sensitive or can_doc_full(scope) or uploaded_by = auth.uid()));
create policy documents_ins on documents for insert with check (can_doc_update(scope));
create policy documents_upd on documents for update
  using (can_doc_update(scope)) with check (can_doc_update(scope));
create policy documents_del on documents for delete using (can_doc_full(scope));

-- Version history follows the parent document (RLS on `documents` applies inside the subquery).
drop policy if exists document_versions_sel on document_versions;
drop policy if exists document_versions_ins on document_versions;
drop policy if exists document_versions_upd on document_versions;
drop policy if exists document_versions_del on document_versions;

create policy document_versions_sel on document_versions for select
  using (exists (select 1 from documents d where d.id = document_versions.document_id));
create policy document_versions_ins on document_versions for insert
  with check (exists (select 1 from documents d where d.id = document_versions.document_id and can_doc_update(d.scope)));
-- No update/delete policies: version rows are append-only.

-- ---------- Tighten visibility of resident names and balances ----------
-- Found by testing: a user with no finance access could list the residents through
-- the balances view. The view now returns rows only to users who can view finance,
-- and resident profiles are visible only to users of modules where they matter.
create or replace view resident_balances with (security_invoker = true) as
select
  p.id as resident_id,
  p.full_name,
  coalesce((select sum(e.total_amount) from expenses e
            where e.paid_by = p.id and e.voided_at is null), 0)
  - coalesce((select sum(s.share_amount) from expense_shares s
              join expenses e on e.id = s.expense_id
              where s.resident_id = p.id and e.voided_at is null), 0)
  + coalesce((select sum(amount) from payments where from_resident = p.id), 0)
  - coalesce((select sum(amount) from payments where to_resident = p.id), 0)
  as net_balance
from profiles p
where p.is_resident and p.is_active and can_view('finance');

drop policy if exists profiles_self_or_users on profiles;
create policy profiles_self_or_users on profiles for select
  using (id = auth.uid() or can_view('users')
         or (is_resident and (can_view('finance') or can_view('villa') or can_view('documents'))));
