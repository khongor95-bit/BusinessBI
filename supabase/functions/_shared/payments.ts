/* ============================================================
   payments.ts — payments хүснэгтийн нийтлэг логик (create / check / webhook / mock)
   ============================================================ */
import { admin, getSetting } from "./http.ts";

export const PRODUCTS: Record<string, { amount: number; currency: string; title: string; validHours: number }> = {
  ndsh_hhoat: { amount: 5000, currency: "MNT", title: "НДШ → ХХОАТ маягт (1 тайлан татах)", validHours: 24 },
  receipt:    { amount: 5000, currency: "MNT", title: "Баримтын зураг → бичилт (24 цагийн эрх)", validHours: 24 },
};
export const REUSE_PENDING_MS = 8 * 60 * 1000;   // WIRE intent 10 мин TTL

export type Payment = {
  id: string; uid: string; email: string; tool: string; amount: number; currency: string;
  status: "pending" | "paid" | "failed"; provider: "wire" | "mock"; livemode: boolean;
  provider_intent_id: string | null; provider_session_id: string | null; provider_status: string | null;
  checkout_url: string | null; meta: Record<string, unknown>; created_at: string; paid_at: string | null;
  paid_via: string | null; expires_at: string | null; downloads: number; last_download_at: string | null;
};

const ms = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);

/** Клиентэд буцаах хэлбэр (pay.js-ийн хүлээдэг талбарууд) */
export function publicView(p: Payment) {
  const paid = p.status === "paid" && ms(p.expires_at) > Date.now();
  return {
    paymentId: p.id, status: p.status, paid, amount: p.amount, currency: p.currency, tool: p.tool,
    checkoutUrl: p.status === "pending" ? (p.checkout_url ?? null) : null,
    paidAt: ms(p.paid_at) || null, expiresAt: ms(p.expires_at) || null, downloads: p.downloads ?? 0, provider: p.provider,
  };
}

export async function markPaid(p: Payment, extra: Record<string, unknown>): Promise<Payment> {
  if (p.status === "paid") return p;
  const validHours = PRODUCTS[p.tool]?.validHours ?? 24;
  const paidAt = new Date();
  const upd = { status: "paid", paid_at: paidAt.toISOString(), expires_at: new Date(paidAt.getTime() + validHours * 3600 * 1000).toISOString(), ...extra };
  const { data, error } = await admin().from("payments").update(upd).eq("id", p.id).select().single();
  if (error) throw error;
  return data as Payment;
}

export async function getPayment(id: string): Promise<Payment | null> {
  const { data } = await admin().from("payments").select("*").eq("id", id).maybeSingle();
  return (data as Payment) ?? null;
}

/** Хэрэглэгчийн тухайн хэрэгсэлд хүчинтэй (төлсөн, хугацаа дуусаагүй) төлбөр байна уу */
export async function hasValidPayment(uid: string, tool: string): Promise<Payment | null> {
  const { data } = await admin().from("payments").select("*").eq("uid", uid).eq("tool", tool).eq("status", "paid")
    .gt("expires_at", new Date().toISOString()).order("paid_at", { ascending: false }).limit(1);
  return (data && data[0]) ? (data[0] as Payment) : null;
}

/** mock checkout линкийн гарын үсэг (хэн дуртай нь "төлсөн" болгохоос хамгаална) */
export async function mockSig(paymentId: string): Promise<string> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "mock";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("mock:" + secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(paymentId));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

export async function wireMode(): Promise<"mock" | "test" | "live"> {
  const m = await getSetting("wire_mode", "mock");
  return m === "live" || m === "test" ? m : "mock";
}
export const useWire = (mode: string) => mode === "live" || mode === "test";
export const functionsBase = () => (Deno.env.get("SUPABASE_URL") ?? "") + "/functions/v1";
