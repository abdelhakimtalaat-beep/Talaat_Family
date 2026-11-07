-- Removes every demo row created by seed/sample_data.sql (and any other row flagged is_sample).
delete from family_events where is_sample;
delete from photos where is_sample;
delete from documents where is_sample;
delete from maintenance_records where is_sample;
delete from renovation_tasks where is_sample;
-- Expenses cannot be hard-deleted by design; void sample ones instead.
update expenses set voided_at = now() where is_sample and voided_at is null;
delete from properties where is_sample;
delete from family_members where is_sample;
