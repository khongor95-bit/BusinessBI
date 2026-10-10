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

## 1. Нэг удаагийн тохиргоо

```bash
cd functions && npm install
firebase login
firebase use businessbi
# Blaze (pay-as-you-go) план идэвхтэй байх ёстой — Functions үүнгүйгээр deploy хийгдэхгүй
```

`.env` файл (`.env.example`-ийг хуулна):

```
WIRE_MODE=mock          # эхлээд mock-оор туршаад, дараа нь live
SITE_URL=https://businessbi.mn
WIRE_BASE_URL=https://api.wire.mn/v1
```

Нууц утгууд (Secret Manager — `.env`-д бичихгүй):

```bash
firebase functions:secrets:set WIRE_SECRET_KEY        # WIRE dashboard → API keys (эхлээд test key)
firebase functions:secrets:set WIRE_WEBHOOK_SECRET    # WIRE dashboard → Webhooks → signing secret
```

Firestore индекс (createPayment-ийн query-д хэрэгтэй):

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## 2. Deploy

```bash
firebase deploy --only functions:payments
```

`codebase: payments` гэж тусгаарласан тул өөр фолдероос deploy хийсэн функцүүд (ж: ТТД lookup proxy)
устахгүй. Deploy-ийн дараа гарах URL-ууд:

- `https://asia-northeast1-businessbi.cloudfunctions.net/wireWebhook` → WIRE dashboard-д webhook URL болгож бүртгэнэ
- `https://asia-northeast1-businessbi.cloudfunctions.net/mockCheckout` → тест горимд автоматаар ашиглагдана

## 3. Тест горимоор турших (WIRE-гүй)

1. `WIRE_MODE=mock` → deploy
2. businessbi.mn дээр хөрвүүлэгч нээж, PDF оруулаад «Excel татах»
3. Нэвтрэх → төлбөрийн modal → «WIRE.mn-ээр төлөх» → шинэ цонхонд **mockCheckout** хуудас → «Төлөх (тест)»
4. Цонх өөрөө хаагдаж, Excel татагдана; 24 цагийн дотор дахин татахад төлбөр асуухгүй

## 4. Live болгох

1. WIRE.mn-д мерчант бүртгүүлж, API key + webhook secret авна
2. `firebase functions:secrets:set WIRE_SECRET_KEY` (live key), `WIRE_WEBHOOK_SECRET`
3. **`wire.js` → `WIRE` тохиргоог docs.wire.mn-тэй тулгана** — endpoint зам, талбарын нэрс, webhook толгой/схем.
   Талбарын нэрийг олон хувилбараар (`id`/`payment_intent_id`, `checkout_url`/`url` …) хүлээж авдаг тул
   ихэнхдээ засваргүй ажиллана; ажиллахгүй бол Functions log-д WIRE-ийн бүтэн хариу хэвлэгдэнэ.
4. `.env` → `WIRE_MODE=live` → deploy
5. 5,000₮-ийн жинхэнэ төлбөр хийж, `payments/` дээр `status=paid, paidVia=webhook` орж байгааг шалгана
   (webhook ирэхгүй бол `paidVia=poll` болж байх ёстой — checkPayment WIRE-ээс лавладаг)

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
