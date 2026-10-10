#!/usr/bin/env node
/* WIRE.mn webhook endpoint бүртгэх (нэг удаа, локал компьютерээс).
   WIRE-д webhook-ийг dashboard-оос биш API-аар бүртгэдэг; signing secret (whsec_…) ЗӨВХӨН энэ үед нэг удаа буцна.
   Нэг төсөлд нэг л идэвхтэй endpoint байдаг тул хуучныг --replace-ээр устгана.

   Хэрэглээ (түлхүүрийг файлд БИЧИХГҮЙ, зөвхөн орчны хувьсагчаар):
     WIRE_SECRET_KEY=sk_test_… node scripts/register_webhook.js https://asia-northeast1-businessbi.cloudfunctions.net/wireWebhook
     WIRE_SECRET_KEY=sk_live_… node scripts/register_webhook.js <url> --replace
     WIRE_SECRET_KEY=sk_live_… node scripts/register_webhook.js --list
   Дараа нь:
     firebase functions:secrets:set WIRE_WEBHOOK_SECRET   ← хэвлэгдсэн whsec_… утгыг оруулна
     firebase deploy --only functions:payments
   Эсвэл secret-ийг дэлгэцэнд ч харуулалгүй шууд Secret Manager руу (--secret-only: stdout-д зөвхөн whsec):
     WIRE_SECRET_KEY=$(cat ~/.wire_key) node scripts/register_webhook.js <url> --replace --secret-only \
       | firebase functions:secrets:set WIRE_WEBHOOK_SECRET --data-file=-
*/
"use strict";
const wire = require("../wire");
(async () => {
  const key = process.env.WIRE_SECRET_KEY;
  if (!key) { console.error("WIRE_SECRET_KEY орчны хувьсагч хэрэгтэй (sk_test_… эсвэл sk_live_…)"); process.exit(2); }
  const args = process.argv.slice(2);
  const url = args.find(a => /^https:\/\//.test(a));
  if (args.includes("--list") || !url) {
    const list = await wire.listWebhooks(key);
    console.log(JSON.stringify(list, null, 2));
    if (!url) return;
  }
  if (args.includes("--replace")) {
    for (const ep of await wire.listWebhooks(key)) { console.log("устгаж байна:", ep.id, ep.url); await wire.deleteWebhook(key, ep.id); }
  }
  const r = await wire.registerWebhook(key, url, ["payment_intent.succeeded", "payment_intent.canceled"]);
  if (args.includes("--secret-only")) {
    console.error("Бүртгэгдлээ:", r.id, r.url, "status:", r.status);
    if (!r.secret) { console.error("Хариунд secret ирсэнгүй:", JSON.stringify(r.raw)); process.exit(1); }
    process.stdout.write(r.secret);
    return;
  }
  console.log("\nБүртгэгдлээ:", r.id, r.url, "status:", r.status);
  if (r.secret) {
    console.log("\nSigning secret (ЗӨВХӨН НЭГ УДАА харагдана — одоо Secret Manager-т хадгал):\n\n  " + r.secret + "\n");
    console.log("  firebase functions:secrets:set WIRE_WEBHOOK_SECRET\n  firebase deploy --only functions:payments\n");
    console.log("Deploy-ийн дараа WIRE «endpoint.verification» ping илгээж, функц 200 буцаахад endpoint verified болно.");
  } else {
    console.log("Хариунд secret ирсэнгүй — бүтэн хариу:", JSON.stringify(r.raw));
  }
})().catch(e => { console.error("Алдаа:", e.message, e.body ? JSON.stringify(e.body) : ""); process.exit(1); });
