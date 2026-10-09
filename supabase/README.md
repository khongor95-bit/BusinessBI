# Нягтлангийн сүлжээ — Supabase тохиргоо

1. Supabase → SQL editor → `schema.sql`-ийн агуулгыг бүхэлд нь ажиллуулна (дахин ажиллуулахад аюулгүй).
2. Authentication → Providers: **Google** идэвхтэй (журнал аль хэдийн ашигладаг), **Email** (magic link) идэвхтэй.
   URL configuration → Site URL: `https://businessbi.mn`, Redirect URLs: `https://businessbi.mn/*`.
3. Админ: `mp_is_admin()` функц дотор админы имэйл (`khongor95@gmail.com`) — солих бол энд.
4. Хуучин `mp_accountants` мөрүүдэд `user_id` байхгүй тул тэдгээр нягтлан самбар руу орж чадахгүй —
   нягтлан өөрийн Google-ээр нэвтэрсний дараа админ тухайн мөрийн `user_id`-г гараар онооно
   (Table editor → mp_accountants → user_id = auth.users.id).

## Урсгал
- `accountants.html` — сүлжээ: профайл, хүсэлт (`mp_requests`, нэвтрэлт шаардана)
- `partner.html` — нягтлангийн самбар: хүсэлт → гэрээний санал (`mp_contracts`, нягтлан шууд гарын үсэг зурна) → линк хуваалцах → хүчинтэй болмогц «Журналд компани нээх» (`companies` upsert + `bbi_company_id`)
- `my.html` — компанийн самбар: хүсэлт, гарын үсэг хүлээж буй гэрээ, миний нягтлан, үнэлгээ (зөвхөн хүчинтэй гэрээтэй)
- `contract.html?id=` — гэрээний бичиг, электрон гарын үсэг (`mp_sign_contract` rpc), аудит, хэвлэх/PDF
- `marketplace_admin.html` — нягтлан батлах, хүсэлт/гэрээний тойм

## Аюулгүй байдал
- Гарын үсэг, төлөв, талуудын талбарыг зөвхөн `mp_sign_contract` / `mp_set_contract_status` (security definer, `set_config('bbi.rpc')`) өөрчилнө; шууд update хийвэл trigger хуучин утгыг нь буцаана.
- Нягтлан гэрээний нөхцөлийг зөвхөн `draft`/`sent` төлөвт засна.
- Үнэлгээг зөвхөн тухайн нягтлантай `active`/`terminated` гэрээтэй компанийн төлөөлөгч өгнө.
