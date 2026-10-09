-- ============================================================
-- BusinessBI — Нягтлангийн сүлжээ (marketplace) схем
-- Supabase SQL editor дээр НЭГ УДАА ажиллуулна. Дахин ажиллуулахад аюулгүй
-- (if not exists / or replace). Одоо байгаа mp_accountants, mp_leads,
-- mp_reviews хүснэгтүүдийг устгахгүй — зөвхөн багана нэмнэ.
-- ============================================================

-- ── 1. mp_accountants: нэвтэрсэн хэрэглэгчтэй холбох ───────────
alter table public.mp_accountants add column if not exists user_id uuid references auth.users(id);
alter table public.mp_accountants add column if not exists company_name text;     -- нягтлангийн компани (байвал)
alter table public.mp_accountants add column if not exists tin text;              -- ТТД / регистр (гэрээнд)
alter table public.mp_accountants add column if not exists bank_name text;
alter table public.mp_accountants add column if not exists bank_account text;
alter table public.mp_accountants add column if not exists max_clients int default 10;
alter table public.mp_accountants add column if not exists rating numeric default 0;
alter table public.mp_accountants add column if not exists review_count int default 0;
alter table public.mp_accountants add column if not exists updated_at timestamptz default now();
create unique index if not exists mp_accountants_user_uidx on public.mp_accountants(user_id) where user_id is not null;

-- ── 2. mp_requests: компанийн хүсэлт ────────────────────────────
create table if not exists public.mp_requests (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid not null references auth.users(id),
  accountant_id uuid references public.mp_accountants(id),   -- null = сүлжээнд нээлттэй хүсэлт
  company_name text not null,
  company_reg text,
  contact_name text not null,
  contact_phone text not null,
  contact_email text,
  services text[] default '{}',
  employees int,
  docs_per_month int,
  budget int,
  message text,
  status text not null default 'new' check (status in ('new','offered','contracted','declined','closed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists mp_requests_acc_idx on public.mp_requests(accountant_id, status);
create index if not exists mp_requests_client_idx on public.mp_requests(client_user_id);

-- ── 3. mp_contracts: онлайн гэрээ ───────────────────────────────
create table if not exists public.mp_contracts (
  id uuid primary key default gen_random_uuid(),
  contract_no text,                                           -- BBI-2026-000123 (trigger-ээр)
  request_id uuid references public.mp_requests(id),
  accountant_id uuid not null references public.mp_accountants(id),
  accountant_user_id uuid not null references auth.users(id),
  client_user_id uuid references auth.users(id),              -- компанийн төлөөлөгч (хүсэлт илгээсэн хэрэглэгч)
  client_email text,                                          -- client_user_id хараахан байхгүй бол имэйлээр тулгана
  company_name text not null,
  company_reg text,
  client_name text,                                           -- компанийг төлөөлөх хүн
  client_phone text,
  services text[] not null default '{}',
  fee_monthly int not null default 0,
  fee_vat boolean not null default false,                     -- үнэ НӨАТ орсон эсэх
  pay_day int not null default 10,                            -- сар бүрийн хэддэх өдөр төлөх
  start_date date not null default current_date,
  term_months int not null default 12,
  extra_terms text,
  status text not null default 'draft' check (status in ('draft','sent','signed_accountant','signed_client','active','terminated','declined')),
  accountant_signature text, accountant_signed_at timestamptz,
  client_signature text,     client_signed_at timestamptz,
  bbi_company_id text,                                        -- журналын companies.id (гэрээ идэвхжихэд нээнэ)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists mp_contracts_acc_idx on public.mp_contracts(accountant_user_id, status);
create index if not exists mp_contracts_client_idx on public.mp_contracts(client_user_id, status);

create sequence if not exists public.mp_contract_seq;
create or replace function public.mp_contract_no_trg() returns trigger language plpgsql as $$
begin
  if new.contract_no is null then
    new.contract_no := 'BBI-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.mp_contract_seq')::text, 6, '0');
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists mp_contracts_no on public.mp_contracts;
create trigger mp_contracts_no before insert or update on public.mp_contracts for each row execute function public.mp_contract_no_trg();

-- ── 4. mp_contract_events: аудитын мөр ─────────────────────────
create table if not exists public.mp_contract_events (
  id bigserial primary key,
  contract_id uuid not null references public.mp_contracts(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  type text not null,                                         -- created | sent | signed_accountant | signed_client | activated | terminated | note
  note text,
  created_at timestamptz default now()
);

-- ── 5. Туслах функцүүд ─────────────────────────────────────────
-- Админ (marketplace_admin.html, admin.html) — өөрийн Google бүртгэлээр нэвтэрнэ
create or replace function public.mp_is_admin() returns boolean language sql stable as $$
  select coalesce((auth.jwt() ->> 'email') = 'khongor95@gmail.com', false);
$$;
-- Нэвтэрсэн хэрэглэгч батлагдсан нягтлан мөн үү
create or replace function public.mp_is_accountant() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.mp_accountants where user_id = auth.uid() and status = 'approved');
$$;
-- Гэрээний тал мөн үү (нягтлан эсвэл компани — user_id эсвэл имэйлээр)
create or replace function public.mp_is_party(c public.mp_contracts) returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    c.accountant_user_id = auth.uid()
    or c.client_user_id = auth.uid()
    or (c.client_user_id is null and c.client_email is not null and lower(c.client_email) = lower(coalesce((select email from auth.users where id = auth.uid()), '')))
  );
$$;

-- Гэрээнд гарын үсэг зурах (security definer: талууд зөвхөн өөрийн гарын үсгийн талбарыг л өөрчилнө)
create or replace function public.mp_sign_contract(p_contract_id uuid, p_signature text)
returns public.mp_contracts language plpgsql security definer set search_path = public as $$
declare c public.mp_contracts; me uuid := auth.uid(); my_email text;
begin
  if me is null then raise exception 'Нэвтэрнэ үү'; end if;
  if coalesce(length(trim(p_signature)),0) < 3 then raise exception 'Гарын үсэг (бүтэн нэр) шаардлагатай'; end if;
  select * into c from public.mp_contracts where id = p_contract_id for update;
  if not found then raise exception 'Гэрээ олдсонгүй'; end if;
  if c.status in ('active','terminated','declined') then raise exception 'Гэрээний төлөв (%) гарын үсэг зөвшөөрөхгүй', c.status; end if;
  select email into my_email from auth.users where id = me;
  perform set_config('bbi.rpc','1',true);

  if c.accountant_user_id = me then
    if c.accountant_signed_at is not null then raise exception 'Та аль хэдийн гарын үсэг зурсан'; end if;
    update public.mp_contracts set accountant_signature = trim(p_signature), accountant_signed_at = now(),
      status = case when client_signed_at is not null then 'active' else 'signed_accountant' end
      where id = c.id returning * into c;
    insert into public.mp_contract_events(contract_id, actor_user_id, type, note) values (c.id, me, 'signed_accountant', trim(p_signature));
  elsif c.client_user_id = me or (c.client_user_id is null and c.client_email is not null and lower(c.client_email) = lower(coalesce(my_email,''))) then
    if c.client_signed_at is not null then raise exception 'Та аль хэдийн гарын үсэг зурсан'; end if;
    update public.mp_contracts set client_user_id = coalesce(client_user_id, me), client_signature = trim(p_signature), client_signed_at = now(),
      status = case when accountant_signed_at is not null then 'active' else 'signed_client' end
      where id = c.id returning * into c;
    insert into public.mp_contract_events(contract_id, actor_user_id, type, note) values (c.id, me, 'signed_client', trim(p_signature));
  else
    raise exception 'Та энэ гэрээний тал биш байна';
  end if;

  if c.status = 'active' then
    insert into public.mp_contract_events(contract_id, actor_user_id, type) values (c.id, me, 'activated');
    if c.request_id is not null then update public.mp_requests set status = 'contracted', updated_at = now() where id = c.request_id; end if;
  end if;
  return c;
end $$;

-- Гэрээ цуцлах / татгалзах (аль ч тал)
create or replace function public.mp_set_contract_status(p_contract_id uuid, p_status text, p_note text default null)
returns public.mp_contracts language plpgsql security definer set search_path = public as $$
declare c public.mp_contracts; me uuid := auth.uid();
begin
  if me is null then raise exception 'Нэвтэрнэ үү'; end if;
  select * into c from public.mp_contracts where id = p_contract_id for update;
  if not found or not public.mp_is_party(c) then raise exception 'Эрхгүй'; end if;
  if p_status not in ('terminated','declined') then raise exception 'Зөвхөн terminated/declined'; end if;
  if p_status = 'declined' and c.status = 'active' then raise exception 'Хүчинтэй гэрээг татгалзах боломжгүй — цуцлана (terminated)'; end if;
  perform set_config('bbi.rpc','1',true);
  update public.mp_contracts set status = p_status where id = c.id returning * into c;
  insert into public.mp_contract_events(contract_id, actor_user_id, type, note) values (c.id, me, p_status, p_note);
  return c;
end $$;

-- ── 6. RLS ─────────────────────────────────────────────────────
alter table public.mp_accountants enable row level security;
alter table public.mp_requests enable row level security;
alter table public.mp_contracts enable row level security;
alter table public.mp_contract_events enable row level security;

-- mp_accountants: батлагдсаныг хэн ч уншина; нэвтэрсэн хүн өөрийн профайл үүсгэж/засна
drop policy if exists mp_acc_public_read on public.mp_accountants;
create policy mp_acc_public_read on public.mp_accountants for select using (status = 'approved' or user_id = auth.uid() or public.mp_is_admin());
drop policy if exists mp_acc_insert_own on public.mp_accountants;
create policy mp_acc_insert_own on public.mp_accountants for insert with check (auth.uid() is not null and user_id = auth.uid());
drop policy if exists mp_acc_update_own on public.mp_accountants;
create policy mp_acc_update_own on public.mp_accountants for update using (user_id = auth.uid() or public.mp_is_admin()) with check (user_id = auth.uid() or public.mp_is_admin());
-- (status/verified талбарыг зөвхөн админ service role-оор солино; доорх trigger хэрэглэгчийн өөрчлөлтийг хориглоно)
create or replace function public.mp_acc_guard() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and auth.role() <> 'service_role' and not public.mp_is_admin() then
    new.status := old.status; new.verified := old.verified; new.rating := old.rating; new.review_count := old.review_count;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists mp_acc_guard_trg on public.mp_accountants;
create trigger mp_acc_guard_trg before update on public.mp_accountants for each row execute function public.mp_acc_guard();

-- mp_requests
drop policy if exists mp_req_insert on public.mp_requests;
create policy mp_req_insert on public.mp_requests for insert with check (auth.uid() = client_user_id);
drop policy if exists mp_req_select on public.mp_requests;
create policy mp_req_select on public.mp_requests for select using (
  public.mp_is_admin() or client_user_id = auth.uid()
  or accountant_id in (select id from public.mp_accountants where user_id = auth.uid())
  or (accountant_id is null and public.mp_is_accountant())
);
drop policy if exists mp_req_update on public.mp_requests;
create policy mp_req_update on public.mp_requests for update using (
  client_user_id = auth.uid()
  or accountant_id in (select id from public.mp_accountants where user_id = auth.uid())
  or (accountant_id is null and public.mp_is_accountant())
);

-- mp_contracts: гарын үсэг/төлөв/талуудын талбарыг зөвхөн rpc (set_config('bbi.rpc')) өөрчилнө;
-- нягтлан draft/sent төлөвт нөхцөлийг засна, бусад төлөвт зөвхөн bbi_company_id (журналын холбоос)
create or replace function public.mp_con_guard() returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('bbi.rpc', true),'') <> '1' and auth.role() <> 'service_role' and not public.mp_is_admin() then
    new.status := old.status;
    new.accountant_signature := old.accountant_signature; new.accountant_signed_at := old.accountant_signed_at;
    new.client_signature := old.client_signature;         new.client_signed_at := old.client_signed_at;
    new.client_user_id := old.client_user_id; new.accountant_user_id := old.accountant_user_id; new.accountant_id := old.accountant_id;
    if old.status not in ('draft','sent') then
      new.company_name := old.company_name; new.company_reg := old.company_reg; new.client_name := old.client_name;
      new.client_phone := old.client_phone; new.client_email := old.client_email; new.services := old.services;
      new.fee_monthly := old.fee_monthly; new.fee_vat := old.fee_vat; new.pay_day := old.pay_day;
      new.start_date := old.start_date; new.term_months := old.term_months; new.extra_terms := old.extra_terms;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists mp_con_guard_trg on public.mp_contracts;
create trigger mp_con_guard_trg before update on public.mp_contracts for each row execute function public.mp_con_guard();

-- mp_contracts: нягтлан үүсгэнэ (өөрийн профайлаар), талууд уншина, нягтлан засна (trigger хязгаарлана)
drop policy if exists mp_con_insert on public.mp_contracts;
create policy mp_con_insert on public.mp_contracts for insert with check (
  accountant_user_id = auth.uid() and accountant_id in (select id from public.mp_accountants where user_id = auth.uid() and status = 'approved')
);
drop policy if exists mp_con_select on public.mp_contracts;
create policy mp_con_select on public.mp_contracts for select using (public.mp_is_party(mp_contracts) or public.mp_is_admin());
drop policy if exists mp_con_update on public.mp_contracts;
create policy mp_con_update on public.mp_contracts for update using (accountant_user_id = auth.uid())
  with check (accountant_user_id = auth.uid());

-- mp_contract_events
drop policy if exists mp_ev_select on public.mp_contract_events;
create policy mp_ev_select on public.mp_contract_events for select using (
  exists (select 1 from public.mp_contracts c where c.id = contract_id and public.mp_is_party(c))
);
drop policy if exists mp_ev_insert on public.mp_contract_events;
create policy mp_ev_insert on public.mp_contract_events for insert with check (
  actor_user_id = auth.uid() and exists (select 1 from public.mp_contracts c where c.id = contract_id and public.mp_is_party(c))
);

-- mp_reviews: зөвхөн ХҮЧИНТЭЙ гэрээтэй компанийн төлөөлөгч үнэлгээ өгнө (хуучин: хэн ч)
alter table public.mp_reviews add column if not exists contract_id uuid references public.mp_contracts(id);
alter table public.mp_reviews add column if not exists reviewer_user_id uuid references auth.users(id);
alter table public.mp_reviews enable row level security;
drop policy if exists mp_rev_select on public.mp_reviews;
create policy mp_rev_select on public.mp_reviews for select using (approved = true or reviewer_user_id = auth.uid() or public.mp_is_admin());
drop policy if exists mp_rev_admin on public.mp_reviews;
create policy mp_rev_admin on public.mp_reviews for all using (public.mp_is_admin()) with check (public.mp_is_admin());
drop policy if exists mp_rev_insert on public.mp_reviews;
create policy mp_rev_insert on public.mp_reviews for insert with check (
  reviewer_user_id = auth.uid() and exists (
    select 1 from public.mp_contracts c where c.id = contract_id and c.accountant_id = mp_reviews.accountant_id
      and c.client_user_id = auth.uid() and c.status in ('active','terminated')
  )
);

-- mp_leads (хуучин хүсэлтийн хүснэгт): хэн ч үүсгэнэ, зөвхөн админ уншина/засна
alter table public.mp_leads enable row level security;
drop policy if exists mp_leads_insert on public.mp_leads;
create policy mp_leads_insert on public.mp_leads for insert with check (true);
drop policy if exists mp_leads_admin on public.mp_leads;
create policy mp_leads_admin on public.mp_leads for all using (public.mp_is_admin()) with check (public.mp_is_admin());

-- Журналын companies: нягтлан гэрээ идэвхжихэд өөрийн нэр дээр компани нээнэ (одоо байгаа бодлого
-- user_id = auth.uid() гэж зөвшөөрдөг байх ёстой; байхгүй бол:)
-- create policy companies_own on public.companies for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant usage on schema public to anon, authenticated;
grant select on public.mp_accountants to anon, authenticated;
grant insert, update on public.mp_accountants to authenticated;
grant select, insert, update on public.mp_requests to authenticated;
grant select, insert, update on public.mp_contracts to authenticated;
grant select, insert on public.mp_contract_events to authenticated;
grant usage, select on sequence public.mp_contract_seq to authenticated;
grant execute on function public.mp_sign_contract(uuid, text) to authenticated;
grant execute on function public.mp_set_contract_status(uuid, text, text) to authenticated;
grant execute on function public.mp_is_accountant() to anon, authenticated;
grant execute on function public.mp_is_admin() to anon, authenticated;
grant select, insert, update, delete on public.mp_reviews to authenticated;
grant insert on public.mp_leads to anon, authenticated;
grant select, update, delete on public.mp_leads to authenticated;
