-- Family Hub: core schema (Phase 1 foundation covering all planned entities)
-- Run in Supabase SQL editor or via `supabase db push`.

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type app_module as enum (
  'dashboard','documents','photos','directory','tree',
  'villa','maintenance','finance','calendar','users','settings'
);
create type access_level as enum ('none','view','update','full');
create type task_status as enum ('not_started','in_progress','on_hold','completed');
create type split_method as enum ('equal','percentage','fixed','custom');

-- ---------- Roles & permissions ----------
create table roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  created_at timestamptz not null default now()
);

create table role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  module app_module not null,
  level access_level not null default 'none',
  primary key (role_id, module)
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  preferred_lang text not null default 'ar' check (preferred_lang in ('ar','en')),
  role_id uuid references roles(id),
  is_admin boolean not null default false,
  is_active boolean not null default true,
  is_resident boolean not null default false,
  created_at timestamptz not null default now()
);

-- Per-user override of role permissions (admin customises everything)
create table user_permissions (
  user_id uuid not null references profiles(id) on delete cascade,
  module app_module not null,
  level access_level not null,
  primary key (user_id, module)
);

-- ---------- Family ----------
create table family_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  birth_date date,
  death_date date,
  gender text check (gender in ('male','female')),
  phone text,
  alt_phone text,
  email text,
  address text,
  relationship_label text,
  branch text,
  notes text,
  photo_drive_file_id uuid,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  -- prevents obvious duplicates
  unique (full_name, birth_date)
);

create table family_relationships (
  id uuid primary key default gen_random_uuid(),
  member_a uuid not null references family_members(id) on delete cascade,
  member_b uuid not null references family_members(id) on delete cascade,
  kind text not null check (kind in ('parent_of','spouse_of','sibling_of')),
  created_at timestamptz not null default now(),
  check (member_a <> member_b),
  unique (member_a, member_b, kind)
);

-- ---------- Google Drive references ----------
create table google_drive_files (
  id uuid primary key default gen_random_uuid(),
  drive_file_id text not null unique,
  name text not null,
  mime_type text,
  size_bytes bigint,
  folder_path text,
  version int not null default 1,
  sync_status text not null default 'synced' check (sync_status in ('pending','synced','error')),
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- Documents ----------
create table document_categories (
  id serial primary key,
  slug text unique not null,
  name_ar text not null,
  name_en text not null
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category_id int not null references document_categories(id),
  member_id uuid references family_members(id),
  document_number text,
  issue_date date,
  expiry_date date,
  issuing_authority text,
  notes text,
  file_id uuid references google_drive_files(id),
  is_sensitive boolean not null default false,
  uploaded_by uuid references profiles(id),
  is_sample boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index on documents (category_id);
create index on documents (member_id);
create index on documents (expiry_date);

create table document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  file_id uuid not null references google_drive_files(id),
  version int not null,
  changed_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (document_id, version)
);

-- ---------- Photos ----------
create table photo_albums (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid references photo_albums(id) on delete set null,
  title text,
  description text,
  taken_on date,
  location text,
  privacy text not null default 'family' check (privacy in ('private','family','selected')),
  file_id uuid references google_drive_files(id),
  content_hash text,
  uploaded_by uuid references profiles(id),
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);
create index on photos (album_id);
create index on photos (content_hash);

create table photo_tags (
  photo_id uuid not null references photos(id) on delete cascade,
  tag text not null,
  primary key (photo_id, tag)
);

-- ---------- Events ----------
create table family_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null default 'occasion',
  event_date date not null,
  recurs_yearly boolean not null default false,
  member_id uuid references family_members(id),
  notes text,
  created_by uuid references profiles(id),
  is_sample boolean not null default false
);

-- ---------- Villa ----------
create table properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  address text,
  floors_count int,
  total_area_m2 numeric(10,2),
  construction_info text,
  ownership_info text,
  is_sample boolean not null default false
);

create table villa_floors (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  level int not null default 0
);

create table villa_spaces (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid references villa_floors(id) on delete cascade,
  parent_id uuid references villa_spaces(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  kind text not null default 'room',
  current_condition text,
  completion_pct int not null default 0 check (completion_pct between 0 and 100)
);

create table contractors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trade text,
  phone text,
  notes text
);

create table renovation_projects (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id),
  name text not null,
  start_date date,
  target_date date
);

create table renovation_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references renovation_projects(id) on delete cascade,
  space_id uuid references villa_spaces(id),
  title text not null,
  description text,
  work_type text,
  responsible text,
  priority int not null default 2 check (priority between 1 and 3),
  start_date date,
  target_date date,
  status task_status not null default 'not_started',
  estimated_cost numeric(14,2) not null default 0,
  actual_cost numeric(14,2) not null default 0,
  notes text,
  is_sample boolean not null default false
);

create table maintenance_records (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references villa_spaces(id),
  system text not null,
  description text not null,
  done_on date not null,
  contractor_id uuid references contractors(id),
  cost numeric(14,2) not null default 0,
  warranty_info text,
  next_due date,
  recurrence_months int,
  notes text,
  is_sample boolean not null default false
);

-- ---------- Finance ----------
create table expense_categories (
  id serial primary key,
  slug text unique not null,
  name_ar text not null,
  name_en text not null
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category_id int not null references expense_categories(id),
  space_id uuid references villa_spaces(id),
  task_id uuid references renovation_tasks(id),
  maintenance_id uuid references maintenance_records(id),
  expense_date date not null,
  supplier text,
  invoice_number text,
  total_amount numeric(14,2) not null check (total_amount > 0),
  currency text not null default 'EGP',
  payment_method text,
  paid_by uuid not null references profiles(id),
  receipt_file_id uuid references google_drive_files(id),
  split split_method not null default 'equal',
  notes text,
  voided_at timestamptz,
  created_by uuid references profiles(id),
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);
create index on expenses (expense_date);
create index on expenses (paid_by);

-- One row per resident per expense; shares must add up to the total.
create table expense_shares (
  expense_id uuid not null references expenses(id) on delete cascade,
  resident_id uuid not null references profiles(id),
  share_amount numeric(14,2) not null check (share_amount >= 0),
  primary key (expense_id, resident_id)
);

-- A payment/settlement from one resident to another
create table payments (
  id uuid primary key default gen_random_uuid(),
  from_resident uuid not null references profiles(id),
  to_resident uuid not null references profiles(id),
  amount numeric(14,2) not null check (amount > 0),
  paid_on date not null default current_date,
  method text,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  check (from_resident <> to_resident)
);

create table financial_settlements (
  id uuid primary key default gen_random_uuid(),
  period_label text not null,
  closed_by uuid references profiles(id),
  closed_at timestamptz not null default now(),
  snapshot jsonb not null
);

-- ---------- Notifications & audit ----------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table activity_logs (
  id bigint generated always as identity primary key,
  user_id uuid,
  action text not null,           -- insert | update | delete | login ...
  table_name text,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index on activity_logs (table_name, created_at desc);

-- ---------- Ledger view ----------
-- Net balance per resident = paid out - own share + settlements sent - settlements received.
-- Positive => others owe this resident. Negative => this resident owes others.
create view resident_balances with (security_invoker = true) as
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
where p.is_resident and p.is_active;
