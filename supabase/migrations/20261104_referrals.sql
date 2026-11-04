-- ============================================================
-- BusinessBI — урамшууллын код (affiliate)
-- Нягтлан бүр нэг код авна. Код ашигласан худалдан авагч 10% хөнгөлөлт авч,
-- код эзэмшигч төлөгдсөн дүнгийн 20%-ийг шимтгэл болгон авна.
-- Шимтгэлийг admin гараар шилжүүлж mp_referral_payouts-д бүртгэнэ.
-- Дахин ажиллуулахад аюулгүй (if not exists / or replace).
-- ============================================================
create table if not exists public.mp_referral_codes (
  code            text        primary key check (code ~ '^[A-Z0-9]{4,16}$'),
  user_id         uuid        not null unique references auth.users(id) on delete cascade,
  discount_pct    int         not null default 10 check (discount_pct between 0 and 50),
  commission_pct  int         not null default 20 check (commission_pct between 0 and 50),
  active          boolean     not null default true,
  created_at      timestamptz not null default now()
);
alter table public.mp_referral_codes enable row level security;
drop policy if exists ref_select_own on public.mp_referral_codes;
create policy ref_select_own on public.mp_referral_codes for select to authenticated
  using (user_id = auth.uid() or public.mp_is_admin());
drop policy if exists ref_insert_own on public.mp_referral_codes;
create policy ref_insert_own on public.mp_referral_codes for insert to authenticated
  with check (user_id = auth.uid() and public.mp_is_accountant() and discount_pct = 10 and commission_pct = 20 and active);
drop policy if exists ref_admin_all on public.mp_referral_codes;
create policy ref_admin_all on public.mp_referral_codes for all to authenticated
  using (public.mp_is_admin()) with check (public.mp_is_admin());

-- Шилжүүлсэн шимтгэл
create table if not exists public.mp_referral_payouts (
  id         uuid        primary key default gen_random_uuid(),
  code       text        not null references public.mp_referral_codes(code) on delete cascade,
  amount     int         not null check (amount > 0),
  note       text,
  paid_at    timestamptz not null default now()
);
alter table public.mp_referral_payouts enable row level security;
drop policy if exists payout_select_own on public.mp_referral_payouts;
create policy payout_select_own on public.mp_referral_payouts for select to authenticated
  using (public.mp_is_admin() or exists (select 1 from public.mp_referral_codes c where c.code = mp_referral_payouts.code and c.user_id = auth.uid()));
drop policy if exists payout_admin_all on public.mp_referral_payouts;
create policy payout_admin_all on public.mp_referral_payouts for all to authenticated
  using (public.mp_is_admin()) with check (public.mp_is_admin());

-- Төлбөрт код, хөнгөлөлт
alter table public.payments add column if not exists ref_code    text;
alter table public.payments add column if not exists base_amount integer;
alter table public.payments add column if not exists discount    integer not null default 0;
create index if not exists payments_ref_code on public.payments (ref_code) where ref_code is not null;

-- Код шалгах (нэвтрээгүй ч дуудна) — өөрийн кодыг өөртөө ашиглахгүй
create or replace function public.referral_check(p_code text)
returns table (code text, discount_pct int, owner_name text)
language sql stable security definer set search_path = public as $$
  select c.code, c.discount_pct, coalesce(a.name, '')
  from public.mp_referral_codes c
  left join public.mp_accountants a on a.user_id = c.user_id
  where c.code = upper(trim(p_code)) and c.active
    and c.user_id is distinct from auth.uid();
$$;
grant execute on function public.referral_check(text) to anon, authenticated;

-- Өөрийн кодын статистик
create or replace function public.my_referral_stats()
returns table (code text, discount_pct int, commission_pct int, paid_count bigint, revenue bigint, commission bigint, paid_out bigint)
language sql stable security definer set search_path = public as $$
  select c.code, c.discount_pct, c.commission_pct,
         (select count(*) from public.payments p where p.ref_code = c.code and p.status = 'paid'),
         (select coalesce(sum(p.amount), 0) from public.payments p where p.ref_code = c.code and p.status = 'paid'),
         (select coalesce(sum(floor(p.amount * c.commission_pct / 100.0)), 0)::bigint from public.payments p where p.ref_code = c.code and p.status = 'paid'),
         (select coalesce(sum(o.amount), 0) from public.mp_referral_payouts o where o.code = c.code)
  from public.mp_referral_codes c
  where c.user_id = auth.uid();
$$;
grant execute on function public.my_referral_stats() to authenticated;
