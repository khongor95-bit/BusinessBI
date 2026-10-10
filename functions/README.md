# BusinessBI — төлбөрийн функцүүд (WIRE.mn)

НДШ → ХХОАТ хөрвүүлэгчийн «Excel татах» үйлдлийг төлбөртэй (1 тайлан = 5,000₮) болгох сервер тал.
Статик сайт (GitHub Pages) дээр API key тавих боломжгүй тул WIRE.mn-тэй харьцах бүх зүйл энд,
Firebase Cloud Functions (v2, Node 20, бүс `asia-northeast1`) дээр ажиллана.

## Бүтэц

| Функц | Төрөл | Үүрэг |
|---|---|---|
| `createPayment` | callable | Нэвтэрсэн хэрэглэгчид нэхэмжлэл үүсгэж WIRE checkout URL буцаана. 30 мин дотор төлөгдөөгүй нэхэмжлэл байвал түүнийг дахин ашиглана. |
| `checkPayment` | callable | Төлөв. `pending` бол WIRE-ээс шууд лавлана (webhook хоцорсон ч ажиллана). `consume:true` → татсан тоо +1. |
| `wireWebhook` | https | WIRE.mn-ээс ирэх гарын үсэгтэй мэдэгдэл → `payments/{id}.status = paid`. |
| `mockCheckout` | https | `WIRE_MODE=mock` үед WIRE-гүйгээр урсгалыг бүтнээр турших «банкны хуудас». Live-д хаалттай. |

Firestore: `payments/{paymentId}` — `uid, email, tool, amount, currency, status(pending|paid|failed), provider(wire|mock), providerIntentId, checkoutUrl, meta, createdAt, paidAt, expiresAt(=paidAt+24ц), downloads`.
`paymentEvents/` — webhook эвентийн аудит.

Клиент тал: `../pay.js` (`BBIPay.require`), буцах хуудас `../pay_done.html`.

## WIRE.mn API (docs.wire.mn-тэй 2026-10-10-нд тулгасан)

| Зүйл | Утга |
|---|---|
| Base URL | `https://api.wire.mn/v1` |
| Auth | `Authorization: Bearer sk_test_…` / `sk_live_…` |
| Idempotency | бүх POST-д `Idempotency-Key` толгой заавал (бид `pi-<paymentId>`, `cs-<paymentId>`) |
| Дүн | бага нэгжээр: **5,000₮ = 500000** (`wire.js` өөрөө ×100 хийнэ) |
| Нэхэмжлэл | `POST /payment_intents` → `{id:"pi_…", status:"requires_payment_method"}` → `POST /checkout/sessions {payment_intent, success_url, cancel_url}` → `{url:"https://pay.wire.mn/c/…"}` |
| Intent TTL | 10 минут — тул төлөгдөөгүй нэхэмжлэлийг 8 минутын дотор л дахин ашиглана |
| Төлөв | `GET /payment_intents/{id}` → `succeeded` = төлсөн; `canceled` = бүтэлгүй; бусад = хүлээгдэж байна |
| Webhook | API-аар бүртгэнэ (`POST /webhook_endpoints`), dashboard-д биш; secret `whsec_…` зөвхөн нэг удаа буцна; нэг төсөлд нэг л endpoint |
| Гарын үсэг | `WirePayment-Signature: t=<сек>,v1=<hex>`; `v1 = HMAC-SHA256(secret, t + "." + rawBody)`; 300 сек tolerance |
| Эвент | `{id, type:"payment_intent.succeeded", data:<PaymentIntent — metadata.paymentId дотор нь>}`; `endpoint.verification` ping-д 200 |
| Тест | `sk_test_` + `allowed_operators:["sandbox"]` (WIRE_MODE=test үед автоматаар); дүн 42 → `amount_too_small`, 42424 → timeout, бусад → succeeded; webhook тест горимд ч ирнэ |

## 1. Нэг удаагийн тохиргоо

```bash
cd functions && npm install
firebase login
firebase use businessbi
# Blaze (pay-as-you-go) план идэвхтэй байх ёстой — Functions үүнгүйгээр deploy хийгдэхгүй
```

`.env` файл (`.env.example`-ийг хуулна):

```
WIRE_MODE=mock          # mock → test → live гэж шатлан явна
SITE_URL=https://businessbi.mn
WIRE_BASE_URL=https://api.wire.mn/v1
WIRE_OPERATORS=         # live: dashboard → Холболтууд дээр идэвхжүүлсэн операторын id (ж: qpay); хоосон бол WIRE өөрөө сонгоно
```

Нууц утгууд (Secret Manager — `.env`-д бичихгүй, чатад ч бичихгүй):

```bash
firebase functions:secrets:set WIRE_SECRET_KEY        # WIRE dashboard → API keys (эхлээд sk_test_…)
firebase functions:secrets:set WIRE_WEBHOOK_SECRET    # scripts/register_webhook.js хэвлэсэн whsec_…
```

Firestore индекс (createPayment-ийн query-д хэрэгтэй):

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## 2. Deploy

```bash
firebase deploy --only functions:payments
```

`codebase: payments` гэж тусгаарласан тул өөр фолдероос deploy хийсэн функцүүд устахгүй. Deploy-ийн дараа гарах URL-ууд:

- `https://asia-northeast1-businessbi.cloudfunctions.net/wireWebhook` → WIRE-д webhook болгож бүртгэнэ (доорх 3.3)
- `https://asia-northeast1-businessbi.cloudfunctions.net/mockCheckout` → зөвхөн `WIRE_MODE=mock` үед

## 3. Гурван шат: mock → test → live

### 3.1 mock (WIRE-гүй, бүртгэлгүй)

1. `WIRE_MODE=mock` → deploy
2. businessbi.mn дээр хөрвүүлэгч нээж, PDF оруулаад «Excel татах»
3. Нэвтрэх → төлбөрийн modal → «WIRE.mn-ээр төлөх» → шинэ цонхонд **mockCheckout** хуудас → «Төлөх (тест)»
4. Цонх өөрөө хаагдаж, Excel татагдана; 24 цагийн дотор дахин татахад төлбөр асуухгүй

### 3.2 test (жинхэнэ WIRE API, sandbox оператор, мөнгө шилжихгүй)

1. wire.mn дээр бүртгүүлж, утас + ДАН-аар баталгаажуулна (test горимд оператор идэвхжүүлэх шаардлагагүй)
2. Dashboard → API keys → `sk_test_…` → `firebase functions:secrets:set WIRE_SECRET_KEY`
3. Webhook бүртгэх (локал компьютерээс, түлхүүрийг файлд бичихгүй):
   ```bash
   WIRE_SECRET_KEY=sk_test_… node scripts/register_webhook.js https://asia-northeast1-businessbi.cloudfunctions.net/wireWebhook
   ```
   Хэвлэгдсэн `whsec_…`-ийг → `firebase functions:secrets:set WIRE_WEBHOOK_SECRET`
4. `.env` → `WIRE_MODE=test` → `firebase deploy --only functions:payments`
   (deploy-ийн дараа WIRE `endpoint.verification` ping илгээж, 200 авбал endpoint **verified**; `--list`-ээр шалгана)
5. Сайтаас 5,000₮-ийн төлбөр эхлүүлэх → `pay.wire.mn` хуудас нээгдэнэ → sandbox-оор төлөх → `payments/{id}` дээр `status=paid, paidVia=webhook` орсныг Firestore-оос шалгана. Webhook ирэхгүй бол `paidVia=poll` болж байх ёстой (checkPayment WIRE-ээс лавладаг).

### 3.3 live

1. WIRE dashboard → **Холболтууд** → оператор сонгож хүсэлт илгээнэ: байгууллагын мэдээлэл (нэр, регистр, үйл ажиллагаа), хаяг, холбоо барих, **орлого хүлээн авах данс** → WIRE ажлын цагаар хянаж, имэйлээр хариу → цахим гэрээг ДАН-аар гарын үсэг зурна (шимтгэлийн нөхцөл гэрээнд) → холболт автоматаар идэвхжинэ
2. Dashboard → API keys → `sk_live_…` → `firebase functions:secrets:set WIRE_SECRET_KEY` (чатад хуулсан түлхүүрийг **солих** — хуучныг dashboard-оос цуцална)
3. Webhook-ийг live түлхүүрээр дахин бүртгэнэ (test/live тусдаа): `WIRE_SECRET_KEY=sk_live_… node scripts/register_webhook.js <url> --replace` → шинэ `whsec_…` → `WIRE_WEBHOOK_SECRET`
4. `.env` → `WIRE_MODE=live`, `WIRE_OPERATORS=<идэвхжүүлсэн операторын id>` (эсвэл хоосон) → deploy
5. 5,000₮-ийн жинхэнэ төлбөр хийж `payments/` дээр `status=paid, livemode=true` орсныг шалгана
6. Алдаа `connector_required` / `settlement_account_required` гарвал 1-р алхам дутуу: оператор идэвхжээгүй эсвэл данс холбогдоогүй

## 4. Юу хаана байна

- `wire.js` — WIRE API адаптер (intent → checkout session, төлөв, webhook гарын үсэг, endpoint бүртгэх)
- `index.js` — createPayment / checkPayment / wireWebhook / mockCheckout
- `scripts/register_webhook.js` — webhook endpoint бүртгэх, жагсаах, солих
- `../pay.js`, `../pay_done.html` — клиент тал

## 5. Тест ажиллуулах (сүлжээгүй)

```bash
npm test                      # wire.js: гарын үсэг, эвент задлал
node test/flow.test.js        # бүтэн урсгал — санах ойн Firestore-оор
```

## Үнэ өөрчлөх / шинэ хэрэгсэл нэмэх

`index.js` → `PRODUCTS` (сервер эрх мэдэлтэй) ба `../pay.js` → `PRICES` (зөвхөн харуулах) хоёуланд нь.

## receiptExtract — ebarimt/НӨАТ баримтын зураг → бүртгэлийн санал (JSON)

Хэрэгжүүлэлт: `receipt.js` (callable) + `receipt_rules.js` (схем, систем промпт, шалгагч, НӨАТ-ын тоон шалгалт). Клиент: `../receipt.js` (`BBIReceipt.extract(file, {hint})`).
Загвар: Claude (`claude-opus-5-5`, `.env` дэх `RECEIPT_MODEL`-оор солино), structured outputs (`output_config.format` json_schema) тул хариу үргэлж схемтэй JSON.

```bash
firebase functions:secrets:set ANTHROPIC_API_KEY   # console.anthropic.com → API keys
cd functions && npm install                         # @anthropic-ai/sdk нэмэгдсэн
npm test                                            # wire + receipt дүрмийн тест
firebase deploy --only functions:payments           # эсвэл --only functions:receiptExtract
```

URL: `https://asia-northeast1-businessbi.cloudfunctions.net/receiptExtract` (callable протокол: `{data:{image,mime,hint?}}` → `{result:{ok,receipt,model,usage}}`, `Authorization: Bearer <ID token>`).
Дүрэм: `total`=«Төлөх дүн» (Бүртгэгдсэн/Дэд дүн биш), `vat_amount`=«НӨАТ» («НХАТ» → `city_tax`), `vat_check`: НӨАТ ≈ total×10/110 ±1₮. Зураг дээрх заавар маягийн текст → `suspicious_text:true`, `review_required:true`.
