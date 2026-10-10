-- ============================================================
-- BusinessBI — төлбөр (WIRE.mn), ebarimt кэш, тохиргоо, үйл ажиллагааны лог
-- Edge Functions (supabase/functions/*) эдгээрийг service role-оор бичнэ;
-- хэрэглэгч зөвхөн өөрийн мөрийг (RLS) уншина. Дахин ажиллуулахад аюулгүй.
-- ============================================================
create extension if not exists pgcrypto;

-- Төлбөр: нэг мөр = нэг нэхэмжлэл (WIRE payment intent эсвэл mock)
create table if not exists public.payments (
  id                   uuid        primary key default gen_random_uuid(),
  uid                  uuid        not null references auth.users(id) on delete cascade,
  email                text        not null default '',
  tool                 text        not null,                       -- ndsh_hhoat | receipt
  amount               integer     not null,                       -- төгрөгөөр
  currency             text        not null default 'MNT',
  status               text        not null default 'pending' check (status in ('pending','paid','failed')),
  provider             text        not null default 'mock' check (provider in ('wire','mock')),
  livemode             boolean     not null default false,
  provider_intent_id   text,
  provider_session_id  text,
  provider_status      text,
  checkout_url         text,
  meta                 jsonb       not null default '{}'::jsonb,
  created_at           timestamptz not null default now(),
  paid_at              timestamptz,
  paid_via             text,                                       -- webhook | poll | mock
  expires_at           timestamptz,                                -- paid_at + validHours
  downloads            integer     not null default 0,
  last_download_at     timestamptz,
  provider_raw         jsonb
);
create index if not exists payments_uid_tool_created on public.payments (uid, tool, created_at desc);
create index if not exists payments_intent on public.payments (provider_intent_id);
alter table public.payments enable row level security;
drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments for select to authenticated
  using (uid = auth.uid() or public.mp_is_admin());
-- insert/update/delete: зөвхөн service role (Edge Functions)

-- WIRE webhook эвентүүд (аудит + давхардлын хамгаалалт: id = WIRE event id)
create table if not exists public.payment_events (
  id           text        primary key,
  received_at  timestamptz not null default now(),
  type         text,
  intent_id    text,
  status       text,
  livemode     boolean     not null default false,
  raw          jsonb
);
alter table public.payment_events enable row level security;
drop policy if exists payment_events_admin on public.payment_events;
create policy payment_events_admin on public.payment_events for select to authenticated using (public.mp_is_admin());

-- Нууц биш тохиргоо (wire_mode, site_url, wire_operators, receipt_model …) — админ самбараас солино
create table if not exists public.app_settings (
  key         text        primary key,
  value       text        not null default '',
  updated_at  timestamptz not null default now()
);
alter table public.app_settings enable row level security;
drop policy if exists app_settings_admin_read on public.app_settings;
create policy app_settings_admin_read on public.app_settings for select to authenticated using (public.mp_is_admin());
insert into public.app_settings (key, value) values
  ('wire_mode', 'mock'),
  ('site_url', 'https://businessbi.mn'),
  ('wire_operators', ''),
  ('receipt_model', 'claude-opus-5-5'),
  ('admin_emails', 'khongor95@gmail.com')
on conflict (key) do nothing;

-- Серверийн нууц (webhook signing secret г.м.) — RLS идэвхтэй, policy байхгүй ⇒ зөвхөн service role
create table if not exists public.app_secrets (
  key         text        primary key,
  value       text        not null,
  updated_at  timestamptz not null default now()
);
alter table public.app_secrets enable row level security;

-- ebarimt.mn лавлагааны кэш (30 хоног). key = 't<ТТД>' эсвэл 'r<РД>'
create table if not exists public.ebarimt_cache (
  key         text        primary key,
  tin         text        not null default '',
  reg         text        not null default '',
  name        text        not null default '',
  vat_payer   boolean     not null default false,
  found       boolean     not null default false,
  fetched_at  timestamptz not null default now()
);
alter table public.ebarimt_cache enable row level security;
-- зөвхөн service role

-- Хэрэгслийн хэрэглээний лог (gate.js-ийн Firestore activityLogs-ийн Supabase хувилбар)
create table if not exists public.activity_logs (
  id          bigint      generated always as identity primary key,
  uid         uuid        references auth.users(id) on delete set null,
  email       text        not null default '',
  action      text        not null,
  details     jsonb       not null default '{}'::jsonb,
  device      text        not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists activity_logs_created on public.activity_logs (created_at desc);
alter table public.activity_logs enable row level security;
drop policy if exists activity_logs_insert_own on public.activity_logs;
create policy activity_logs_insert_own on public.activity_logs for insert to authenticated
  with check (uid = auth.uid() and char_length(action) <= 64 and pg_column_size(details) <= 4096);
drop policy if exists activity_logs_admin_read on public.activity_logs;
create policy activity_logs_admin_read on public.activity_logs for select to authenticated using (public.mp_is_admin());
