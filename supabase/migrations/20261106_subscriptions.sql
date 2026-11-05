-- ============================================================
-- BusinessBI — санхүүгийн програмын захиалга (Эхлэл / Бизнес / Нягтлан)
-- Төлбөр: payments.tool = sub_start_m|sub_start_y|sub_biz_m|sub_biz_y|sub_acc_m|sub_acc_y
-- Төлөгдмөгц Edge Function (markPaid → extendSubscription) subscriptions.paid_until-ийг сунгана.
-- Эхлэлтийн хямдрал: эхний 100 төлсөн хэрэглэгч 50% (app_settings).
-- ============================================================
insert into public.app_settings (key, value) values ('launch_pct', '50') on conflict (key) do nothing;
insert into public.app_settings (key, value) values ('launch_limit', '100') on conflict (key) do nothing;
insert into public.app_settings (key, value) values ('launch_until', '') on conflict (key) do nothing;

-- Үнийн хуудас, програм: хямдралын үлдсэн байр (нэвтрээгүй ч харна)
create or replace function public.launch_slots_left()
returns table (pct int, left_slots int, until_date text)
language sql stable security definer set search_path = public as $$
  with s as (
    select coalesce((select value from public.app_settings where key = 'launch_pct'), '0')::int as pct,
           coalesce((select value from public.app_settings where key = 'launch_limit'), '0')::int as lim,
           coalesce((select value from public.app_settings where key = 'launch_until'), '') as until_date
  ), c as (
    select count(distinct uid)::int as used from public.payments where tool like 'sub\_%' and status = 'paid'
  )
  select case when s.until_date <> '' and current_date > s.until_date::date then 0 else s.pct end,
         greatest(0, s.lim - c.used), s.until_date
  from s, c;
$$;
grant execute on function public.launch_slots_left() to anon, authenticated;

-- Багцын хязгаар (клиент энэ утгаар компанийн тоо, модулийг хязгаарлана)
create or replace function public.plan_limits(p_plan text)
returns table (companies int, all_modules boolean)
language sql immutable as $$
  select case p_plan when 'starter' then 1 when 'business' then 3 when 'accountant' then 15 else 3 end,
         p_plan <> 'starter';
$$;
grant execute on function public.plan_limits(text) to anon, authenticated;
