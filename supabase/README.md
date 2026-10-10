# Supabase тохиргоо

## Санхүүгийн програм (журнал) — cloud хадгалалт
`journal_schema.sql`-ийг SQL editor дээр ажиллуулна: `companies` (тохиргоо, данс, харилцагч, цалин, хөрөнгө, үйл явдлын бүртгэл, үеийн түгжээ, хуулгын загвар — meta jsonb), `journal_months` (сар бүрийн бичилт), `snapshots` (сэргээх цэг; `keep=true` — жилийн хаалт, үеийн түгжээний үед автоматаар үүсч, хэзээ ч устгагдахгүй = 10 жилийн хадгалалт, НББ-ийн хууль 11.1), `subscriptions` + `ensure_trial()` (30 хоногийн туршилт). RLS: хэрэглэгч зөвхөн өөрийн мөр. Эрх сунгах: `update subscriptions set paid_until='2027-01-01' where user_id='…'`.

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

# Төлбөр (WIRE.mn), ebarimt лавлагаа, баримт уншигч — Edge Functions

2026-10-10-аас Firebase Cloud Functions-ийн оронд **Supabase Edge Functions** (Deno). Firebase Blaze план хэрэггүй;
нэвтрэлт нэг (Supabase Auth), дата нэг DB-д. `functions/` хавтас устгагдсан.

| Функц | Зам | Нэвтрэлт | Үүрэг |
|---|---|---|---|
| `payments` | `POST /functions/v1/payments/create` | хэрэглэгч | нэхэмжлэл + WIRE checkout URL (эсвэл mock хуудас) |
| | `POST /functions/v1/payments/check` | хэрэглэгч | төлөв; pending бол WIRE-ээс лавлана; `consume:true` → татсан тоо +1 |
| | `POST /functions/v1/payments/webhook` | WIRE гарын үсэг | `payment_intent.succeeded` → `payments.status='paid'`; `endpoint.verification` → 200 |
| | `GET/POST /functions/v1/payments/mock` | линкийн sig | `wire_mode=mock` үеийн тест «банкны хуудас» |
| | `POST /functions/v1/payments/admin` | админ | горим солих, webhook бүртгэх, тохиргоо, сүүлийн төлбөрүүд |
| `ebarimt-lookup` | `POST /functions/v1/ebarimt-lookup` | нийтийн | ebarimt.mn РД/ТТД → нэр, НӨАТ төлөгч эсэх; `ebarimt_cache` 30 хоног |
| `receipt-extract` | `POST /functions/v1/receipt-extract` | хэрэглэгч + `receipt` төлбөр | баримтын зураг → Claude → `receipt_rules` схемээр баталгаажсан JSON |

Протокол (бүгд): `{data:{…}}` → `200 {result:{…}}` эсвэл `4xx {error:{status, message}}`. Клиент: `mp.js` → `BBIMP.callFn(name, data)`;
`pay.js`, `ebarimt.js`, `receipt.js` үүнийг ашиглана. `mp.js` нь хуучин `gate.js`-тэй нийцтэй `BBIGate` API-г (protect/logActivity/getUser) Supabase дээр өгдөг тул
хэрэгслийн хуудсууд `<script src="mp.js">` + `<body data-auth="supabase">`.

## Хүснэгт (`migrations/20261010_payments.sql`)
`payments` (хэрэглэгч өөрийнхийг уншина, бичих зөвхөн service role), `payment_events` (webhook аудит, id = WIRE event id → давхардал),
`app_settings` (wire_mode, site_url, wire_operators, receipt_model, admin_emails — админ самбараас солино, deploy хэрэггүй),
`app_secrets` (webhook signing secret; policy байхгүй = зөвхөн service role), `ebarimt_cache`, `activity_logs` (хэрэгслийн хэрэглээ; хэрэглэгч өөрийнхийг insert, админ уншина).

## Нууц түлхүүр (Supabase → Project Settings → Edge Functions → Secrets)
- `WIRE_SECRET_KEY` — WIRE dashboard → API keys (`sk_test_…` эхлээд, дараа `sk_live_…`)
- `ANTHROPIC_API_KEY` — баримт уншигчид
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` — автоматаар байдаг
Webhook secret (`whsec_…`)-ийг гараар оруулахгүй: админ самбарын «Webhook бүртгэх» товч WIRE-ээс авч `app_secrets`-д хадгална.

## Deploy
Supabase CLI: `supabase functions deploy payments --no-verify-jwt`, `… ebarimt-lookup --no-verify-jwt`, `… receipt-extract --no-verify-jwt`
(нэвтрэлтийг функц дотор `_shared/http.ts` шалгадаг тул gateway-ийн JWT шалгалт унтраалттай — webhook/mock-д JWT байхгүй).
CLI-гүй бол `functions/_bundle.js <name>` файлын жагсаалтыг гаргана (Management API / MCP deploy-д). `_shared/` модулиуд функц бүрт хуулагдан орно.

Тест: `deno test --allow-env supabase/functions/_shared/wire_test.ts supabase/functions/_shared/receipt_rules_test.ts`,
`deno check supabase/functions/*/index.ts` (CI-д ажилладаг).

## mock → test → live (админ самбар: marketplace_admin.html → «Төлбөр · WIRE»)
1. **mock** (анхдагч): сайт дээр төлбөр эхлүүлэх → тест хуудас → «Төлөх (тест)» → Excel татагдана.
2. **test**: wire.mn бүртгэл (утас + ДАН) → `sk_test_…`-ийг Secrets-д → самбар дээр «Webhook бүртгэх» → «→ test».
   Sandbox оператороор төлөхөд `payments` дээр `status=paid, paid_via=webhook` (webhook ирэхгүй бол `poll`).
3. **live**: WIRE → Холболтууд → оператор хүсэлт, данс, гэрээ → `sk_live_…` → «Webhook бүртгэх» (live түлхүүрээр дахин) → «→ live».
   `connector_required` / `settlement_account_required` = оператор идэвхжээгүй / данс холбогдоогүй.

## Мэдэгдэж буй асуудал
- `api.ebarimt.mn` Supabase (Токио) серверээс TCP холболтод хариу өгөхгүй байна (гадаад IP-д хаалттай байж магадгүй).
  `ebarimt.js` тийм үед хөтчөөс (Монголын IP) шууд оролдоно — CORS зөвшөөрөгдсөн бол ажиллана; эс бөгөөс Монголд байрлах жижиг relay хэрэгтэй.
