-- OPTIONAL demo data. Every row has is_sample = true so it can be removed with 9999_remove_sample_data.sql.
insert into family_members (full_name, birth_date, gender, relationship_label, branch, is_sample) values
 ('نموذج: الجد أحمد', '1945-03-12', 'male', 'جد', 'العائلة الرئيسية', true),
 ('نموذج: الجدة فاطمة', '1950-07-01', 'female', 'جدة', 'العائلة الرئيسية', true);

insert into properties (name, description, address, floors_count, total_area_m2, is_sample)
values ('نموذج: الفيلا', 'بيانات تجريبية', 'عنوان تجريبي', 3, 450, true);

insert into family_events (title, kind, event_date, recurs_yearly, is_sample)
values ('نموذج: لمّة عائلية', 'gathering', current_date + 14, false, true);
