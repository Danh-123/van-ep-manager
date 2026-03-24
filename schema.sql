-- =========================================================
-- VanEpManager - Database Schema (Supabase / PostgreSQL)
-- Date: 2026-03-24
-- Notes:
-- 1) Schema is designed for Supabase with auth.users integration.
-- 2) RLS is enabled for all business tables.
-- 3) Roles used at app-level: Admin, KeToan, Viewer.
-- =========================================================

-- ---------------------------------------------------------
-- 0) Extensions (UUID generation support)
-- ---------------------------------------------------------
create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- 1) Types
-- ---------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'app_role'
      and n.nspname = 'public'
  ) then
    create type public.app_role as enum ('Admin', 'KeToan', 'Viewer');
  end if;
end$$;

-- ---------------------------------------------------------
-- 2) Common utility functions
-- ---------------------------------------------------------

-- Auto-update updated_at on each UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------
-- 3) Core tables
-- ---------------------------------------------------------

-- 3.1 profiles: extend auth.users with app metadata.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text unique,
  phone text unique,
  role public.app_role not null default 'Viewer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_phone_format_chk
    check (phone is null or phone ~ '^[0-9+\-() ]{8,20}$')
);

comment on table public.profiles is 'Thong tin nguoi dung ung dung, mo rong tu auth.users';
comment on column public.profiles.role is 'Vai tro he thong: Admin | KeToan | Viewer';

-- Auto create profile row after new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1), 'user'),
    new.email,
    'Viewer'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Returns current signed-in app role from profiles.
-- SECURITY DEFINER helps policy checks avoid recursive RLS issues.
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid();
$$;

-- Check whether current user has one of provided roles.
create or replace function public.has_any_role(p_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() = any(p_roles), false);
$$;

-- 3.2 cong_nhan: workers / laborers.
create table if not exists public.cong_nhan (
  id bigserial primary key,
  ma_cong_nhan text not null unique,
  ho_ten text not null,
  so_dien_thoai text unique,
  ngay_vao_lam date not null default current_date,
  trang_thai text not null default 'DangLam',
  ghi_chu text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cong_nhan_trang_thai_chk check (trang_thai in ('DangLam', 'NghiViec')),
  constraint cong_nhan_phone_format_chk
    check (so_dien_thoai is null or so_dien_thoai ~ '^[0-9+\-() ]{8,20}$')
);

comment on table public.cong_nhan is 'Danh sach cong nhan trong he thong';

-- 3.3 loai_van_ep: default pricing table.
create table if not exists public.loai_van_ep (
  id bigserial primary key,
  ma_loai text not null unique,
  ten_loai text not null unique,
  don_gia numeric(14,2) not null,
  don_vi text not null default 'tan',
  hieu_luc_tu date not null default current_date,
  hieu_luc_den date,
  is_active boolean not null default true,
  ghi_chu text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint loai_van_ep_don_gia_chk check (don_gia >= 0),
  constraint loai_van_ep_hieu_luc_chk check (hieu_luc_den is null or hieu_luc_den >= hieu_luc_tu)
);

comment on table public.loai_van_ep is 'Bang gia mac dinh theo loai van ep';

-- 3.4 xe_hang: trucks/vehicles.
create table if not exists public.xe_hang (
  id bigserial primary key,
  bien_so text not null unique,
  ten_chu_xe text,
  so_dien_thoai text,
  loai_xe text,
  trong_tai_tan numeric(10,2),
  is_active boolean not null default true,
  ghi_chu text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint xe_hang_phone_format_chk
    check (so_dien_thoai is null or so_dien_thoai ~ '^[0-9+\-() ]{8,20}$'),
  constraint xe_hang_trong_tai_chk
    check (trong_tai_tan is null or trong_tai_tan > 0)
);

comment on table public.xe_hang is 'Danh muc xe hang vao/ra bai';

-- 3.5 phieu_can: weigh tickets.
create table if not exists public.phieu_can (
  id bigserial primary key,
  so_phieu text not null unique,
  ngay_can date not null default current_date,
  gio_can_vao timestamptz,
  gio_can_ra timestamptz,
  xe_hang_id bigint not null references public.xe_hang(id) on delete restrict,
  loai_van_ep_id bigint not null references public.loai_van_ep(id) on delete restrict,
  cong_nhan_id bigint references public.cong_nhan(id) on delete set null,
  khach_hang text,
  khoi_luong_tan numeric(12,3) not null,
  don_gia_ap_dung numeric(14,2) not null,
  thanh_tien numeric(16,2) generated always as (khoi_luong_tan * don_gia_ap_dung) stored,
  so_tien_da_tra numeric(16,2) not null default 0,
  ghi_chu text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint phieu_can_khoi_luong_chk check (khoi_luong_tan > 0),
  constraint phieu_can_don_gia_chk check (don_gia_ap_dung >= 0),
  constraint phieu_can_so_tien_da_tra_chk check (so_tien_da_tra >= 0),
  constraint phieu_can_so_tien_da_tra_max_chk check (so_tien_da_tra <= thanh_tien),
  constraint phieu_can_time_order_chk check (gio_can_ra is null or gio_can_vao is null or gio_can_ra >= gio_can_vao)
);

comment on table public.phieu_can is 'Phieu can hang hoa/van ep';

-- 3.6 cham_cong: daily work details per worker.
create table if not exists public.cham_cong (
  id bigserial primary key,
  cong_nhan_id bigint not null references public.cong_nhan(id) on delete cascade,
  ngay date not null,
  phieu_can_id bigint references public.phieu_can(id) on delete set null,
  loai_van_ep_id bigint references public.loai_van_ep(id) on delete set null,
  so_luong numeric(12,3) not null,
  don_gia numeric(14,2) not null,
  thanh_tien numeric(16,2) generated always as (so_luong * don_gia) stored,
  ghi_chu text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cham_cong_so_luong_chk check (so_luong >= 0),
  constraint cham_cong_don_gia_chk check (don_gia >= 0)
);

-- A ticket should only map to at most one cham_cong row.
create unique index if not exists uq_cham_cong_phieu_can
  on public.cham_cong(phieu_can_id)
  where phieu_can_id is not null;

comment on table public.cham_cong is 'Cham cong chi tiet theo ngay cho cong nhan';

-- 3.7 tong_tien_cong_ngay: daily salary summary per worker.
create table if not exists public.tong_tien_cong_ngay (
  id bigserial primary key,
  cong_nhan_id bigint not null references public.cong_nhan(id) on delete cascade,
  ngay date not null,
  tong_so_luong numeric(14,3) not null default 0,
  tong_tien numeric(16,2) not null default 0,
  so_ca integer not null default 0,
  ghi_chu text,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tong_tien_cong_ngay_uniq unique (cong_nhan_id, ngay),
  constraint tong_tien_cong_ngay_so_luong_chk check (tong_so_luong >= 0),
  constraint tong_tien_cong_ngay_tong_tien_chk check (tong_tien >= 0),
  constraint tong_tien_cong_ngay_so_ca_chk check (so_ca >= 0)
);

comment on table public.tong_tien_cong_ngay is 'Tong hop tien cong theo ngay cho moi cong nhan';

-- 3.8 lich_su_thanh_toan: payment history.
create table if not exists public.lich_su_thanh_toan (
  id bigserial primary key,
  cong_nhan_id bigint references public.cong_nhan(id) on delete cascade,
  phieu_can_id bigint references public.phieu_can(id) on delete cascade,
  ngay_thanh_toan date not null default current_date,
  so_tien numeric(16,2) not null,
  nguoi_thu text,
  phuong_thuc text not null default 'TienMat',
  tham_chieu text,
  ghi_chu text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lich_su_thanh_toan_target_chk check (cong_nhan_id is not null or phieu_can_id is not null),
  constraint lich_su_thanh_toan_so_tien_chk check (so_tien > 0),
  constraint lich_su_thanh_toan_phuong_thuc_chk check (phuong_thuc in ('TienMat', 'ChuyenKhoan', 'Khac'))
);

comment on table public.lich_su_thanh_toan is 'Lich su thanh toan cho cong nhan hoac phieu can';

-- 3.9 luong_thang: monthly salary per worker.
create table if not exists public.luong_thang (
  id bigserial primary key,
  cong_nhan_id bigint not null references public.cong_nhan(id) on delete cascade,
  thang smallint not null,
  nam integer not null,
  tong_tien_cong numeric(16,2) not null default 0,
  tong_da_thanh_toan numeric(16,2) not null default 0,
  con_no numeric(16,2) generated always as (tong_tien_cong - tong_da_thanh_toan) stored,
  trang_thai text not null default 'ChuaChot',
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint luong_thang_uniq unique (cong_nhan_id, thang, nam),
  constraint luong_thang_thang_chk check (thang between 1 and 12),
  constraint luong_thang_nam_chk check (nam between 2000 and 2100),
  constraint luong_thang_tong_tien_chk check (tong_tien_cong >= 0),
  constraint luong_thang_da_thanh_toan_chk check (tong_da_thanh_toan >= 0),
  constraint luong_thang_overpay_chk check (tong_da_thanh_toan <= tong_tien_cong),
  constraint luong_thang_trang_thai_chk
    check (trang_thai in ('ChuaChot', 'DaChot', 'DaThanhToanMotPhan', 'DaThanhToanHet'))
);

comment on table public.luong_thang is 'Tong hop luong thang theo cong nhan';

-- 3.10 audit_log: generic audit trail.
create table if not exists public.audit_log (
  id bigserial primary key,
  table_name text not null,
  record_id text not null,
  hanh_dong text not null,
  old_data jsonb,
  new_data jsonb,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now(),
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint audit_log_hanh_dong_chk check (hanh_dong in ('INSERT', 'UPDATE', 'DELETE'))
);

create index if not exists idx_audit_log_table_record on public.audit_log(table_name, record_id);
create index if not exists idx_audit_log_changed_at on public.audit_log(changed_at desc);

comment on table public.audit_log is 'Nhat ky thao tac du lieu de truy vet thay doi';

-- ---------------------------------------------------------
-- 4) Trigger: updated_at for all tables
-- ---------------------------------------------------------

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_cong_nhan_updated_at on public.cong_nhan;
create trigger trg_cong_nhan_updated_at
before update on public.cong_nhan
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_loai_van_ep_updated_at on public.loai_van_ep;
create trigger trg_loai_van_ep_updated_at
before update on public.loai_van_ep
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_xe_hang_updated_at on public.xe_hang;
create trigger trg_xe_hang_updated_at
before update on public.xe_hang
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_phieu_can_updated_at on public.phieu_can;
create trigger trg_phieu_can_updated_at
before update on public.phieu_can
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_cham_cong_updated_at on public.cham_cong;
create trigger trg_cham_cong_updated_at
before update on public.cham_cong
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_tong_tien_cong_ngay_updated_at on public.tong_tien_cong_ngay;
create trigger trg_tong_tien_cong_ngay_updated_at
before update on public.tong_tien_cong_ngay
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_lich_su_thanh_toan_updated_at on public.lich_su_thanh_toan;
create trigger trg_lich_su_thanh_toan_updated_at
before update on public.lich_su_thanh_toan
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_luong_thang_updated_at on public.luong_thang;
create trigger trg_luong_thang_updated_at
before update on public.luong_thang
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_audit_log_updated_at on public.audit_log;
create trigger trg_audit_log_updated_at
before update on public.audit_log
for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------
-- 5) Audit trigger function
-- ---------------------------------------------------------

-- Generic audit function used by business tables.
create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record_id text;
begin
  if tg_op = 'UPDATE' then
    v_record_id = coalesce((to_jsonb(new) ->> 'id'), (to_jsonb(old) ->> 'id'), 'unknown');
    insert into public.audit_log(table_name, record_id, hanh_dong, old_data, new_data, changed_by)
    values (tg_table_name, v_record_id, 'UPDATE', to_jsonb(old), to_jsonb(new), auth.uid());
    return new;
  elsif tg_op = 'DELETE' then
    v_record_id = coalesce((to_jsonb(old) ->> 'id'), 'unknown');
    insert into public.audit_log(table_name, record_id, hanh_dong, old_data, new_data, changed_by)
    values (tg_table_name, v_record_id, 'DELETE', to_jsonb(old), null, auth.uid());
    return old;
  end if;

  return null;
end;
$$;

-- Attach audit triggers to important transaction tables.
drop trigger if exists trg_profiles_audit on public.profiles;
create trigger trg_profiles_audit
after update or delete on public.profiles
for each row execute procedure public.write_audit_log();

drop trigger if exists trg_cong_nhan_audit on public.cong_nhan;
create trigger trg_cong_nhan_audit
after update or delete on public.cong_nhan
for each row execute procedure public.write_audit_log();

drop trigger if exists trg_loai_van_ep_audit on public.loai_van_ep;
create trigger trg_loai_van_ep_audit
after update or delete on public.loai_van_ep
for each row execute procedure public.write_audit_log();

drop trigger if exists trg_xe_hang_audit on public.xe_hang;
create trigger trg_xe_hang_audit
after update or delete on public.xe_hang
for each row execute procedure public.write_audit_log();

drop trigger if exists trg_cham_cong_audit on public.cham_cong;
create trigger trg_cham_cong_audit
after update or delete on public.cham_cong
for each row execute procedure public.write_audit_log();

drop trigger if exists trg_tong_tien_cong_ngay_audit on public.tong_tien_cong_ngay;
create trigger trg_tong_tien_cong_ngay_audit
after update or delete on public.tong_tien_cong_ngay
for each row execute procedure public.write_audit_log();

drop trigger if exists trg_lich_su_thanh_toan_audit on public.lich_su_thanh_toan;
create trigger trg_lich_su_thanh_toan_audit
after update or delete on public.lich_su_thanh_toan
for each row execute procedure public.write_audit_log();

drop trigger if exists trg_phieu_can_audit on public.phieu_can;
create trigger trg_phieu_can_audit
after update or delete on public.phieu_can
for each row execute procedure public.write_audit_log();

drop trigger if exists trg_luong_thang_audit on public.luong_thang;
create trigger trg_luong_thang_audit
after update or delete on public.luong_thang
for each row execute procedure public.write_audit_log();

-- ---------------------------------------------------------
-- 6) Salary recalculation functions
-- ---------------------------------------------------------

-- Recalculate monthly salary summary for one month.
create or replace function public.recalculate_luong_thang(
  p_thang smallint,
  p_nam integer,
  p_cong_nhan_id bigint default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.luong_thang (
    cong_nhan_id,
    thang,
    nam,
    tong_tien_cong,
    tong_da_thanh_toan,
    trang_thai,
    closed_at
  )
  select
    c.id as cong_nhan_id,
    p_thang,
    p_nam,
    coalesce(sum(ttcn.tong_tien), 0) as tong_tien_cong,
    coalesce(sum(lstt.so_tien), 0) as tong_da_thanh_toan,
    case
      when coalesce(sum(lstt.so_tien), 0) = 0 then 'ChuaChot'
      when coalesce(sum(lstt.so_tien), 0) < coalesce(sum(ttcn.tong_tien), 0) then 'DaThanhToanMotPhan'
      else 'DaThanhToanHet'
    end as trang_thai,
    case
      when coalesce(sum(lstt.so_tien), 0) >= coalesce(sum(ttcn.tong_tien), 0) and coalesce(sum(ttcn.tong_tien), 0) > 0 then now()
      else null
    end as closed_at
  from public.cong_nhan c
  left join public.tong_tien_cong_ngay ttcn
    on ttcn.cong_nhan_id = c.id
   and extract(month from ttcn.ngay)::smallint = p_thang
   and extract(year from ttcn.ngay)::integer = p_nam
  left join public.lich_su_thanh_toan lstt
    on lstt.cong_nhan_id = c.id
   and extract(month from lstt.ngay_thanh_toan)::smallint = p_thang
   and extract(year from lstt.ngay_thanh_toan)::integer = p_nam
  where p_cong_nhan_id is null or c.id = p_cong_nhan_id
  group by c.id
  on conflict (cong_nhan_id, thang, nam)
  do update set
    tong_tien_cong = excluded.tong_tien_cong,
    tong_da_thanh_toan = excluded.tong_da_thanh_toan,
    trang_thai = excluded.trang_thai,
    closed_at = excluded.closed_at,
    updated_at = now();
end;
$$;

-- REQUIRED FUNCTION:
-- Recalculate tong_tien_cong_ngay from cham_cong for a specific day.
create or replace function public.recalculate_luong_ngay(p_ngay date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tong_tien_cong_ngay (
    cong_nhan_id,
    ngay,
    tong_so_luong,
    tong_tien,
    so_ca,
    calculated_at
  )
  select
    c.id as cong_nhan_id,
    p_ngay as ngay,
    coalesce(sum(cc.so_luong), 0) as tong_so_luong,
    coalesce(sum(cc.thanh_tien), 0) as tong_tien,
    coalesce(count(cc.id), 0) as so_ca,
    now() as calculated_at
  from public.cong_nhan c
  left join public.cham_cong cc
    on cc.cong_nhan_id = c.id
   and cc.ngay = p_ngay
  group by c.id
  on conflict (cong_nhan_id, ngay)
  do update set
    tong_so_luong = excluded.tong_so_luong,
    tong_tien = excluded.tong_tien,
    so_ca = excluded.so_ca,
    calculated_at = excluded.calculated_at,
    updated_at = now();

  -- Also refresh monthly summary for the affected month.
  perform public.recalculate_luong_thang(
    extract(month from p_ngay)::smallint,
    extract(year from p_ngay)::integer,
    null
  );
end;
$$;

-- Trigger function requested:
-- trigger_recalculate_luong when cham_cong OR tong_tien_cong_ngay changes.
create or replace function public.trigger_recalculate_luong()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ngay date;
  v_cong_nhan_id bigint;
begin
  -- Determine affected day / worker from NEW/OLD row.
  v_ngay = coalesce(new.ngay, old.ngay);
  v_cong_nhan_id = coalesce(new.cong_nhan_id, old.cong_nhan_id);

  if tg_table_name = 'cham_cong' then
    -- Source table changed => recalculate day total.
    perform public.recalculate_luong_ngay(v_ngay);
  elsif tg_table_name = 'tong_tien_cong_ngay' then
    -- Daily total changed => refresh monthly summary for the affected day/month.
    perform public.recalculate_luong_thang(
      extract(month from v_ngay)::smallint,
      extract(year from v_ngay)::integer,
      null
    );
  end if;

  return coalesce(new, old);
end;
$$;

-- Attach required triggers.
drop trigger if exists trg_cham_cong_recalculate_luong on public.cham_cong;
create trigger trg_cham_cong_recalculate_luong
after insert or update or delete on public.cham_cong
for each row execute procedure public.trigger_recalculate_luong();

drop trigger if exists trg_tong_tien_cong_ngay_recalculate_luong on public.tong_tien_cong_ngay;
create trigger trg_tong_tien_cong_ngay_recalculate_luong
after update on public.tong_tien_cong_ngay
for each row execute procedure public.trigger_recalculate_luong();

-- Optional but useful: when payment history changes, update monthly summary.
create or replace function public.trigger_recalculate_luong_from_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date;
  v_cong_nhan_id bigint;
begin
  v_date = coalesce(new.ngay_thanh_toan, old.ngay_thanh_toan);
  v_cong_nhan_id = coalesce(new.cong_nhan_id, old.cong_nhan_id);

  -- If payment is linked to ticket only (not payroll of worker), skip monthly salary recalc.
  if v_cong_nhan_id is null then
    return coalesce(new, old);
  end if;

  perform public.recalculate_luong_thang(
    extract(month from v_date)::smallint,
    extract(year from v_date)::integer,
    v_cong_nhan_id
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_lich_su_thanh_toan_recalculate_luong on public.lich_su_thanh_toan;
create trigger trg_lich_su_thanh_toan_recalculate_luong
after insert or update or delete on public.lich_su_thanh_toan
for each row execute procedure public.trigger_recalculate_luong_from_payment();

-- ---------------------------------------------------------
-- 7) RLS setup
-- ---------------------------------------------------------

-- Enable RLS on all business tables.
alter table public.profiles enable row level security;
alter table public.cong_nhan enable row level security;
alter table public.cham_cong enable row level security;
alter table public.tong_tien_cong_ngay enable row level security;
alter table public.loai_van_ep enable row level security;
alter table public.xe_hang enable row level security;
alter table public.phieu_can enable row level security;
alter table public.lich_su_thanh_toan enable row level security;
alter table public.luong_thang enable row level security;
alter table public.audit_log enable row level security;

-- profiles policies
-- Admin: full access
create policy profiles_admin_all
on public.profiles
for all
using (public.has_any_role(array['Admin']::public.app_role[]))
with check (public.has_any_role(array['Admin']::public.app_role[]));

-- KeToan: can view and update profile basic data (no delete)
create policy profiles_ketoan_select
on public.profiles
for select
using (public.has_any_role(array['KeToan']::public.app_role[]));

create policy profiles_ketoan_update
on public.profiles
for update
using (public.has_any_role(array['KeToan']::public.app_role[]))
with check (public.has_any_role(array['KeToan']::public.app_role[]));

-- Viewer: only view profiles
create policy profiles_viewer_select
on public.profiles
for select
using (public.has_any_role(array['Viewer']::public.app_role[]));

-- Users can always read/update their own profile.
create policy profiles_self_select
on public.profiles
for select
using (id = auth.uid());

create policy profiles_self_update
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

-- Generic policy pattern for operational tables:
-- 1) Admin full, 2) KeToan read/write, 3) Viewer read-only.

-- cong_nhan
create policy cong_nhan_admin_all on public.cong_nhan
for all
using (public.has_any_role(array['Admin']::public.app_role[]))
with check (public.has_any_role(array['Admin']::public.app_role[]));

create policy cong_nhan_ketoan_rw on public.cong_nhan
for all
using (public.has_any_role(array['KeToan']::public.app_role[]))
with check (public.has_any_role(array['KeToan']::public.app_role[]));

create policy cong_nhan_viewer_read on public.cong_nhan
for select
using (public.has_any_role(array['Viewer']::public.app_role[]));

-- cham_cong
create policy cham_cong_admin_all on public.cham_cong
for all
using (public.has_any_role(array['Admin']::public.app_role[]))
with check (public.has_any_role(array['Admin']::public.app_role[]));

create policy cham_cong_ketoan_rw on public.cham_cong
for all
using (public.has_any_role(array['KeToan']::public.app_role[]))
with check (public.has_any_role(array['KeToan']::public.app_role[]));

create policy cham_cong_viewer_read on public.cham_cong
for select
using (public.has_any_role(array['Viewer']::public.app_role[]));

-- tong_tien_cong_ngay
create policy tong_tien_cong_ngay_admin_all on public.tong_tien_cong_ngay
for all
using (public.has_any_role(array['Admin']::public.app_role[]))
with check (public.has_any_role(array['Admin']::public.app_role[]));

create policy tong_tien_cong_ngay_ketoan_rw on public.tong_tien_cong_ngay
for all
using (public.has_any_role(array['KeToan']::public.app_role[]))
with check (public.has_any_role(array['KeToan']::public.app_role[]));

create policy tong_tien_cong_ngay_viewer_read on public.tong_tien_cong_ngay
for select
using (public.has_any_role(array['Viewer']::public.app_role[]));

-- loai_van_ep
create policy loai_van_ep_admin_all on public.loai_van_ep
for all
using (public.has_any_role(array['Admin']::public.app_role[]))
with check (public.has_any_role(array['Admin']::public.app_role[]));

create policy loai_van_ep_ketoan_rw on public.loai_van_ep
for all
using (public.has_any_role(array['KeToan']::public.app_role[]))
with check (public.has_any_role(array['KeToan']::public.app_role[]));

create policy loai_van_ep_viewer_read on public.loai_van_ep
for select
using (public.has_any_role(array['Viewer']::public.app_role[]));

-- xe_hang
create policy xe_hang_admin_all on public.xe_hang
for all
using (public.has_any_role(array['Admin']::public.app_role[]))
with check (public.has_any_role(array['Admin']::public.app_role[]));

create policy xe_hang_ketoan_rw on public.xe_hang
for all
using (public.has_any_role(array['KeToan']::public.app_role[]))
with check (public.has_any_role(array['KeToan']::public.app_role[]));

create policy xe_hang_viewer_read on public.xe_hang
for select
using (public.has_any_role(array['Viewer']::public.app_role[]));

-- phieu_can
create policy phieu_can_admin_all on public.phieu_can
for all
using (public.has_any_role(array['Admin']::public.app_role[]))
with check (public.has_any_role(array['Admin']::public.app_role[]));

create policy phieu_can_ketoan_rw on public.phieu_can
for all
using (public.has_any_role(array['KeToan']::public.app_role[]))
with check (public.has_any_role(array['KeToan']::public.app_role[]));

create policy phieu_can_viewer_read on public.phieu_can
for select
using (public.has_any_role(array['Viewer']::public.app_role[]));

-- lich_su_thanh_toan
create policy lich_su_thanh_toan_admin_all on public.lich_su_thanh_toan
for all
using (public.has_any_role(array['Admin']::public.app_role[]))
with check (public.has_any_role(array['Admin']::public.app_role[]));

create policy lich_su_thanh_toan_ketoan_rw on public.lich_su_thanh_toan
for all
using (public.has_any_role(array['KeToan']::public.app_role[]))
with check (public.has_any_role(array['KeToan']::public.app_role[]));

create policy lich_su_thanh_toan_viewer_read on public.lich_su_thanh_toan
for select
using (public.has_any_role(array['Viewer']::public.app_role[]));

-- luong_thang
create policy luong_thang_admin_all on public.luong_thang
for all
using (public.has_any_role(array['Admin']::public.app_role[]))
with check (public.has_any_role(array['Admin']::public.app_role[]));

create policy luong_thang_ketoan_rw on public.luong_thang
for all
using (public.has_any_role(array['KeToan']::public.app_role[]))
with check (public.has_any_role(array['KeToan']::public.app_role[]));

create policy luong_thang_viewer_read on public.luong_thang
for select
using (public.has_any_role(array['Viewer']::public.app_role[]));

-- audit_log
create policy audit_log_admin_all on public.audit_log
for all
using (public.has_any_role(array['Admin']::public.app_role[]))
with check (public.has_any_role(array['Admin']::public.app_role[]));

create policy audit_log_ketoan_read on public.audit_log
for select
using (public.has_any_role(array['KeToan']::public.app_role[]));

create policy audit_log_viewer_read on public.audit_log
for select
using (public.has_any_role(array['Viewer']::public.app_role[]));

-- ---------------------------------------------------------
-- 8) Helpful indexes
-- ---------------------------------------------------------
create index if not exists idx_cham_cong_ngay on public.cham_cong(ngay);
create index if not exists idx_cham_cong_cong_nhan_ngay on public.cham_cong(cong_nhan_id, ngay);
create index if not exists idx_tong_tien_cong_ngay_ngay on public.tong_tien_cong_ngay(ngay);
create index if not exists idx_phieu_can_ngay_can on public.phieu_can(ngay_can);
create index if not exists idx_lich_su_thanh_toan_date on public.lich_su_thanh_toan(ngay_thanh_toan);
create index if not exists idx_lich_su_thanh_toan_ticket on public.lich_su_thanh_toan(phieu_can_id);
create index if not exists idx_luong_thang_month_year on public.luong_thang(nam, thang);

-- Compatibility for existing databases upgraded from older schema versions.
alter table if exists public.phieu_can
  add column if not exists khach_hang text;

alter table if exists public.phieu_can
  add column if not exists so_tien_da_tra numeric(16,2) not null default 0;

alter table if exists public.lich_su_thanh_toan
  add column if not exists phieu_can_id bigint references public.phieu_can(id) on delete cascade;

alter table if exists public.lich_su_thanh_toan
  add column if not exists nguoi_thu text;

-- End of schema.sql
