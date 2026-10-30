-- =============================================================
--  Shop schema for Supabase (Postgres)
--  วิธีใช้: เปิด Supabase > SQL Editor > วางทั้งไฟล์นี้ > Run
--  รันซ้ำได้ (idempotent) ไม่ลบข้อมูลเดิม
-- =============================================================

create extension if not exists pgcrypto;

-- ---------- Settings (key/value — เพิ่มค่าตั้งค่าใหม่ได้โดยไม่ต้องแก้ตาราง) ----------
create table if not exists settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- Categories (หมวดสินค้า + ธีมของแต่ละหมวด) ----------
create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  tagline     text not null default '',
  description text not null default '',
  -- ธีม: สีหลัก, สีพื้น, ลวดลาย (music | watch | circuit | plain), รูปแบนเนอร์
  theme       jsonb not null default '{"accent":"#334155","surface":"#f1f5f9","ink":"#0f172a","motif":"plain"}'::jsonb,
  banner_url  text,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------- Products ----------
create table if not exists products (
  id               uuid primary key default gen_random_uuid(),
  category_id      uuid not null references categories(id) on delete restrict,
  slug             text not null unique,
  name             text not null,
  summary          text not null default '',
  description      text not null default '',
  price            numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
  stock            int not null default 0 check (stock >= 0),
  low_stock_alert  int not null default 3,
  sku              text,
  images           text[] not null default '{}',
  -- คุณสมบัติสินค้าแบบยืดหยุ่น เช่น {"ยี่ห้อ":"Yamaha","วัสดุ":"ไม้สปรูซ"}
  specs            jsonb not null default '{}'::jsonb,
  is_active        boolean not null default true,
  is_featured      boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists products_category_idx on products(category_id) where is_active;
create index if not exists products_featured_idx on products(is_featured) where is_active;

-- ---------- Customers (ล็อกอินด้วยเบอร์โทร + PIN 4 หลัก) ----------
create table if not exists customers (
  id              uuid primary key default gen_random_uuid(),
  phone           text not null unique,
  pin_hash        text not null,
  name            text not null default '',
  address         jsonb not null default '{}'::jsonb,
  failed_attempts int not null default 0,
  locked_until    timestamptz,
  created_at      timestamptz not null default now()
);

-- ---------- Orders ----------
do $$ begin
  create type order_status as enum
    ('pending_payment','verifying','paid','shipped','completed','cancelled');
exception when duplicate_object then null; end $$;

create table if not exists orders (
  id              uuid primary key default gen_random_uuid(),
  order_no        text not null unique,
  customer_id     uuid not null references customers(id) on delete restrict,
  status          order_status not null default 'pending_payment',
  subtotal        numeric(12,2) not null,
  shipping_fee    numeric(12,2) not null default 0,
  total           numeric(12,2) not null,
  payment_method  text not null,              -- id ของช่องทางชำระ เช่น 'promptpay', 'card'
  payment_ref     text,                       -- เลขอ้างอิงจากผู้ให้บริการชำระเงิน (ใช้ตอนเพิ่มบัตรเครดิต)
  slip_path       text,
  shipping        jsonb not null default '{}'::jsonb,  -- {name, phone, address, note}
  tracking_no     text,
  admin_note      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists orders_customer_idx on orders(customer_id, created_at desc);
create index if not exists orders_status_idx on orders(status, created_at desc);

create table if not exists order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  product_id  uuid references products(id) on delete set null,
  name        text not null,          -- เก็บชื่อ/ราคา ณ ตอนสั่ง เผื่อสินค้าถูกแก้ภายหลัง
  image       text,
  unit_price  numeric(12,2) not null,
  qty         int not null check (qty > 0),
  line_total  numeric(12,2) not null
);
create index if not exists order_items_order_idx on order_items(order_id);

create table if not exists order_events (
  id         bigserial primary key,
  order_id   uuid not null references orders(id) on delete cascade,
  status     order_status not null,
  note       text,
  actor      text not null default 'system',   -- 'customer' | 'admin' | 'system'
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_idx on order_events(order_id, created_at);

-- ---------- Security: ปิดการเข้าถึงตรงจากเบราว์เซอร์ทั้งหมด ----------
-- ทุกการอ่าน/เขียนผ่านเซิร์ฟเวอร์ (service role) เท่านั้น
alter table settings     enable row level security;
alter table categories   enable row level security;
alter table products     enable row level security;
alter table customers    enable row level security;
alter table orders       enable row level security;
alter table order_items  enable row level security;
alter table order_events enable row level security;

-- =============================================================
--  place_order: สร้างออเดอร์ + ตัดสต๊อก แบบ atomic
--  ราคาคำนวณจากฐานข้อมูลเสมอ ไม่เชื่อราคาที่ส่งมาจากเบราว์เซอร์
--  p_items = [{"product_id":"...","qty":2}, ...]
-- =============================================================
create or replace function place_order(
  p_customer_id    uuid,
  p_items          jsonb,
  p_shipping       jsonb,
  p_payment_method text,
  p_shipping_fee   numeric default 0,
  p_free_over      numeric default null
) returns orders
language plpgsql
as $$
declare
  v_item     jsonb;
  v_product  products;
  v_qty      int;
  v_subtotal numeric(12,2) := 0;
  v_fee      numeric(12,2);
  v_order    orders;
  v_no       text;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  -- ล็อกแถวสินค้าตามลำดับ id เพื่อกัน deadlock และตรวจสต๊อก
  for v_item in
    select x from jsonb_array_elements(p_items) x order by x->>'product_id'
  loop
    v_qty := (v_item->>'qty')::int;
    if v_qty is null or v_qty <= 0 then raise exception 'BAD_QTY'; end if;

    select * into v_product from products
      where id = (v_item->>'product_id')::uuid for update;

    if not found or not v_product.is_active then
      raise exception 'PRODUCT_UNAVAILABLE:%', coalesce(v_product.name, v_item->>'product_id');
    end if;
    if v_product.stock < v_qty then
      raise exception 'OUT_OF_STOCK:%:%', v_product.name, v_product.stock;
    end if;
    v_subtotal := v_subtotal + v_product.price * v_qty;
  end loop;

  v_fee := case when p_free_over is not null and v_subtotal >= p_free_over then 0
                else coalesce(p_shipping_fee, 0) end;

  -- เลขออเดอร์อ่านง่าย: OD-YYMMDD-XXXX
  loop
    v_no := 'OD-' || to_char(now() at time zone 'Asia/Bangkok', 'YYMMDD') || '-' ||
            upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 4));
    exit when not exists (select 1 from orders where order_no = v_no);
  end loop;

  insert into orders (order_no, customer_id, subtotal, shipping_fee, total, payment_method, shipping)
  values (v_no, p_customer_id, v_subtotal, v_fee, v_subtotal + v_fee, p_payment_method, coalesce(p_shipping, '{}'::jsonb))
  returning * into v_order;

  for v_item in select x from jsonb_array_elements(p_items) x loop
    v_qty := (v_item->>'qty')::int;
    update products set stock = stock - v_qty, updated_at = now()
      where id = (v_item->>'product_id')::uuid
      returning * into v_product;

    insert into order_items (order_id, product_id, name, image, unit_price, qty, line_total)
    values (v_order.id, v_product.id, v_product.name, v_product.images[1],
            v_product.price, v_qty, v_product.price * v_qty);
  end loop;

  insert into order_events (order_id, status, note, actor)
  values (v_order.id, 'pending_payment', 'สร้างคำสั่งซื้อ', 'customer');

  return v_order;
end $$;

-- =============================================================
--  set_order_status: เปลี่ยนสถานะ + บันทึกประวัติ
--  ยกเลิกออเดอร์ → คืนสต๊อกอัตโนมัติ (คืนครั้งเดียว)
--  ดึงกลับจากยกเลิก → ตัดสต๊อกอีกรอบ (ถ้าของพอ)
-- =============================================================
create or replace function set_order_status(
  p_order_id uuid,
  p_status   order_status,
  p_note     text default null,
  p_actor    text default 'admin'
) returns orders
language plpgsql
as $$
declare
  v_order orders;
  v_item  order_items;
  v_stock int;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.status = p_status then return v_order; end if;

  if p_status = 'cancelled' then
    for v_item in select * from order_items where order_id = p_order_id loop
      update products set stock = stock + v_item.qty, updated_at = now()
        where id = v_item.product_id;
    end loop;
  elsif v_order.status = 'cancelled' then
    for v_item in select * from order_items where order_id = p_order_id order by product_id loop
      select stock into v_stock from products where id = v_item.product_id for update;
      if v_stock is null or v_stock < v_item.qty then
        raise exception 'OUT_OF_STOCK:%:%', v_item.name, coalesce(v_stock, 0);
      end if;
      update products set stock = stock - v_item.qty, updated_at = now()
        where id = v_item.product_id;
    end loop;
  end if;

  update orders set status = p_status, updated_at = now()
    where id = p_order_id returning * into v_order;

  insert into order_events (order_id, status, note, actor)
  values (p_order_id, p_status, p_note, p_actor);

  return v_order;
end $$;

-- ฟังก์ชันเรียกได้จากเซิร์ฟเวอร์เท่านั้น
revoke all on function place_order(uuid, jsonb, jsonb, text, numeric, numeric) from public, anon, authenticated;
revoke all on function set_order_status(uuid, order_status, text, text) from public, anon, authenticated;

-- =============================================================
--  Storage buckets
--  products: รูปสินค้า (เปิดให้ดูได้สาธารณะ)
--  slips:    สลิปโอนเงิน (ส่วนตัว — แอดมินดูผ่านลิงก์ชั่วคราว)
-- =============================================================
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('slips', 'slips', false)
on conflict (id) do nothing;

-- =============================================================
--  ข้อมูลตั้งต้น: 3 หมวด + ค่าตั้งค่าร้าน
-- =============================================================
insert into categories (slug, name, tagline, description, theme, sort_order) values
  ('music',   'เครื่องดนตรี',  'เสียงที่ใช่ เริ่มจากเครื่องที่ชอบ',
   'กีตาร์ เปียโนไฟฟ้า กลอง และอุปกรณ์สำหรับนักดนตรีทุกระดับ',
   '{"accent":"#B07A2A","surface":"#F6EFE3","ink":"#2B1E12","motif":"music"}', 1),
  ('watches', 'นาฬิกา',       'เวลาที่สวยงามบนข้อมือ',
   'นาฬิกาออโตเมติก ควอตซ์ และสมาร์ตวอทช์ คัดมาให้ใส่ได้ทุกวัน',
   '{"accent":"#1F3A5F","surface":"#E9EEF4","ink":"#0E1B2C","motif":"watch"}', 2),
  ('gadget',  'Gadget & IT',  'ของเล่นสายเทค ใช้ได้จริงทุกวัน',
   'หูฟัง ลำโพง คีย์บอร์ด อุปกรณ์เสริมมือถือและคอมพิวเตอร์',
   '{"accent":"#2563EB","surface":"#E8EEFB","ink":"#0B1530","motif":"circuit"}', 3)
on conflict (slug) do nothing;

insert into settings (key, value) values
  ('shop',     '{"name":"ร้านของเรา","tagline":"ดนตรี เวลา และเทคโนโลยี ในร้านเดียว","contact_phone":"","line_id":"","address":""}'),
  ('promptpay','{"enabled":true,"id":"","account_name":""}'),
  ('shipping', '{"flat_fee":50,"free_over":1500}')
on conflict (key) do nothing;
