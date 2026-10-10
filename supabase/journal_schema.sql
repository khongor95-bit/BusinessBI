-- ============================================================
-- BusinessBI санхүүгийн програм (businessbi_journal.html) — Supabase cloud хадгалалт
-- ------------------------------------------------------------
-- Зорилго: НББ-ийн тухай хуулийн 11.1 (баримт, бүртгэлийг 10 жил хадгалах) —
-- localStorage нь үүнийг хангахгүй тул нэвтэрсэн хэрэглэгчийн бүх дата
-- (тохиргоо, данс, харилцагч, журнал, цалин, хөрөнгө, үйл явдлын бүртгэл,
-- үеийн түгжээ, хуулгын загвар) эндэ хадгалагдана. Supabase → SQL editor
-- дээр бүхэлд нь ажиллуулна (дахин ажиллуулахад аюулгүй).
-- ============================================================

create extension if not exists pgcrypto;

-- Компани: журналын тохиргоо, данс, харилцагч, дүрэм, цалин, хөрөнгө, seq, employees,
-- events (үйл явдлын бүртгэл), locks (үеийн түгжээ), bankLayouts — бүгд meta (jsonb)
create table if not exists public.companies (
  user_id        uuid        not null references auth.users(id) on delete cascade,
  id             text        not null,                     -- 'default' эсвэл клиент талын id
  name           text        not null default '',
  meta           jsonb       not null default '{}'::jsonb,
  journal_count  integer     not null default 0,
  updated_at     timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  primary key (user_id, id)
);

-- Журнал: сар бүрийн бичилтүүд нэг мөрөнд (entries jsonb[]) — сараар upsert хийдэг
create table if not exists public.journal_months (
  user_id     uuid        not null references auth.users(id) on delete cascade,
  company_id  text        not null,
  month       text        not null,                        -- 'YYYY-MM'
  entries     jsonb       not null default '[]'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (user_id, company_id, month)
);
create index if not exists journal_months_company on public.journal_months (user_id, company_id);

-- Сэргээх цэг (бүх DB-ийн хуулбар). keep=true мөр (жилийн хаалт, үеийн түгжээ) хэзээ ч
-- автоматаар устгагдахгүй — 10 жилийн хадгалалтын баталгаа; бусад нь сүүлийн 10-аар хязгаарлагдана.
create table if not exists public.snapshots (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  company_id     text        not null,
  label          text        not null default '',
  journal_count  integer     not null default 0,
  keep           boolean     not null default false,
  data           jsonb       not null,
  created_at     timestamptz not null default now()
);
alter table public.snapshots add column if not exists keep boolean not null default false;
create index if not exists snapshots_company on public.snapshots (user_id, company_id, created_at desc);

-- Эрх: 30 хоногийн туршилт автоматаар (ensure_trial), дараа нь paid_until-ийг админ сунгана
create table if not exists public.subscriptions (
  user_id     uuid        primary key references auth.users(id) on delete cascade,
  plan        text        not null default 'trial',
  paid_until  date        not null default (current_date + 30),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.ensure_trial() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.subscriptions (user_id) values (auth.uid()) on conflict (user_id) do nothing;
end $$;

-- updated_at автоматаар
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists companies_touch on public.companies;
create trigger companies_touch before update on public.companies for each row execute function public.touch_updated_at();
drop trigger if exists journal_months_touch on public.journal_months;
create trigger journal_months_touch before update on public.journal_months for each row execute function public.touch_updated_at();

-- RLS: хэрэглэгч зөвхөн өөрийн мөрүүдийг
alter table public.companies      enable row level security;
alter table public.journal_months enable row level security;
alter table public.snapshots      enable row level security;
alter table public.subscriptions  enable row level security;

drop policy if exists companies_own on public.companies;
create policy companies_own on public.companies for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists journal_months_own on public.journal_months;
create policy journal_months_own on public.journal_months for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists snapshots_own on public.snapshots;
create policy snapshots_own on public.snapshots for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists subscriptions_read_own on public.subscriptions;
create policy subscriptions_read_own on public.subscriptions for select using (user_id = auth.uid());
-- paid_until-ийг зөвхөн админ/SQL-ээр сунгана (клиентээс update хориотой)

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.companies to authenticated;
grant select, insert, update, delete on public.journal_months to authenticated;
grant select, insert, update, delete on public.snapshots to authenticated;
grant select on public.subscriptions to authenticated;
grant execute on function public.ensure_trial() to authenticated;
