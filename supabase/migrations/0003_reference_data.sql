-- Reference data (permanent) + roles with default permissions.
insert into document_categories (slug, name_ar, name_en) values
 ('identity','وثائق الهوية الشخصية','Personal identification'),
 ('birth','شهادات الميلاد','Birth certificates'),
 ('marriage','وثائق الزواج','Marriage certificates'),
 ('education','الشهادات التعليمية','Educational certificates'),
 ('employment','وثائق العمل','Employment documents'),
 ('property','وثائق الملكية','Property ownership'),
 ('villa_legal','عقود وأوراق الفيلا القانونية','Villa contracts & legal'),
 ('insurance','وثائق التأمين','Insurance'),
 ('bank','وثائق بنكية ومالية','Bank & financial'),
 ('medical','وثائق طبية','Medical & healthcare'),
 ('utility','فواتير المرافق','Utility bills'),
 ('receipts','إيصالات وفواتير','Receipts & invoices'),
 ('other','مستندات أخرى','Other documents')
on conflict do nothing;

insert into expense_categories (slug, name_ar, name_en) values
 ('construction','بناء وتشطيب','Construction & finishing'),
 ('electrical','أعمال كهربائية','Electrical works'),
 ('plumbing','سباكة','Plumbing'),
 ('painting','دهانات','Painting'),
 ('carpentry','نجارة','Carpentry'),
 ('furniture','أثاث','Furniture'),
 ('equipment','معدات','Equipment'),
 ('maintenance','صيانة','Maintenance'),
 ('cleaning','نظافة','Cleaning'),
 ('utilities','مرافق','Utilities'),
 ('contractor','دفعات مقاولين','Contractor payments'),
 ('other','مصروفات أخرى','Other expenses')
on conflict do nothing;

insert into roles (name, description) values
 ('admin','Main administrator'),
 ('resident','Villa resident (mother / sister)'),
 ('relative','Invited relative, limited access')
on conflict do nothing;

-- Defaults follow the permission table in the brief. Admin can override any of them.
insert into role_permissions (role_id, module, level)
select r.id, m.module::app_module, m.level::access_level from roles r join (values
  ('resident','dashboard','view'),('resident','documents','view'),('resident','photos','update'),
  ('resident','directory','update'),('resident','tree','update'),('resident','villa','update'),
  ('resident','maintenance','update'),('resident','finance','update'),('resident','calendar','update'),
  ('resident','users','none'),('resident','settings','view'),
  ('relative','dashboard','view'),('relative','documents','none'),('relative','photos','view'),
  ('relative','directory','view'),('relative','tree','view'),('relative','villa','none'),
  ('relative','maintenance','none'),('relative','finance','none'),('relative','calendar','view'),
  ('relative','users','none'),('relative','settings','view')
) as m(role, module, level) on m.role = r.name
on conflict do nothing;
