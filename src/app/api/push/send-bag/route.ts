import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
export const runtime = "nodejs";

const vapidSubject = process.env.VAPID_SUBJECT || "mailto:chegoumotoca@gmail.com";

type SendBagPayload = {
  bagCode?: string;
  establishmentName?: string;
  cityId?: string | null;
  deliveriesCount?: number;
  amount?: number;
};

type StoredSubscription = {
  id: string;
  endpoint: string;
  p256dh?: string | null;
  auth?: string | null;
  subscription_json?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  } | null;
  city_id?: string | null;
};

function enabled() {
  return Boolean(supabaseUrl && serviceRoleKey && vapidPublicKey && vapidPrivateKey);
}

function base64UrlToBuffer(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function bufferToBase64Url(input: Buffer) {
  return input.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function hkdfExpand(prk: Buffer, info: Buffer, length: number) {
  const blocks: Buffer[] = [];
  let previous = Buffer.alloc(0);
  let counter = 1;
  while (Buffer.concat(blocks).length < length) {
    previous = crypto.createHmac("sha256", prk).update(Buffer.concat([previous, info, Buffer.from([counter])])).digest();
    blocks.push(previous);
    counter += 1;
  }
  return Buffer.concat(blocks).subarray(0, length);
}

function createVapidAuthorization(endpoint: string) {
  if (!vapidPublicKey || !vapidPrivateKey) throw new Error("VAPID ausente");
  const publicKey = base64UrlToBuffer(vapidPublicKey);
  if (publicKey.length !== 65 || publicKey[0] !== 4) throw new Error("Chave pública VAPID inválida");
  const privateKey = base64UrlToBuffer(vapidPrivateKey);
  const origin = new URL(endpoint).origin;
  const header = bufferToBase64Url(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = bufferToBase64Url(Buffer.from(JSON.stringify({ aud: origin, exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, sub: vapidSubject })));
  const key = crypto.createPrivateKey({
    key: {
      kty: "EC",
      crv: "P-256",
      x: bufferToBase64Url(publicKey.subarray(1, 33)),
      y: bufferToBase64Url(publicKey.subarray(33, 65)),
      d: bufferToBase64Url(privateKey),
    },
    format: "jwk",
  });
  const signature = crypto.sign("sha256", Buffer.from(`${header}.${body}`), { key, dsaEncoding: "ieee-p1363" });
  return `vapid t=${header}.${body}.${bufferToBase64Url(signature)}, k=${vapidPublicKey}`;
}

function encryptPushPayload(subscription: StoredSubscription, payload: string) {
  const p256dh = subscription.subscription_json?.keys?.p256dh || subscription.p256dh;
  const auth = subscription.subscription_json?.keys?.auth || subscription.auth;
  if (!p256dh || !auth) throw new Error("Inscrição sem chaves push");

  const receiverPublicKey = base64UrlToBuffer(p256dh);
  const authSecret = base64UrlToBuffer(auth);
  const salt = crypto.randomBytes(16);
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.generateKeys();
  const senderPublicKey = ecdh.getPublicKey();
  const sharedSecret = ecdh.computeSecret(receiverPublicKey);

  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), receiverPublicKey, senderPublicKey]);
  const ikm = crypto.createHmac("sha256", authSecret).update(sharedSecret).digest();
  const prk = crypto.createHmac("sha256", salt).update(ikm).digest();
  const cek = hkdfExpand(prk, Buffer.from("Content-Encoding: aes128gcm\0"), 16);
  const nonce = hkdfExpand(prk, Buffer.from("Content-Encoding: nonce\0"), 12);

  const plaintext = Buffer.concat([Buffer.from(payload), Buffer.from([0x02])]);
  const cipher = crypto.createCipheriv("aes-128-gcm", cek, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);

  const recordSize = Buffer.alloc(4);
  recordSize.writeUInt32BE(4096, 0);
  return Buffer.concat([salt, recordSize, Buffer.from([senderPublicKey.length]), senderPublicKey, encrypted]);
}

async function sendWebPush(subscription: StoredSubscription, payload: string) {
  const endpoint = subscription.subscription_json?.endpoint || subscription.endpoint;
  if (!endpoint) throw new Error("Endpoint ausente");
  const body = encryptPushPayload(subscription, payload);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      TTL: "600",
      Urgency: "high",
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      Authorization: createVapidAuthorization(endpoint),
    },
    body: new Uint8Array(body),
  });
  if (!response.ok) {
    const err = new Error(`Push falhou: ${response.status}`) as Error & { statusCode?: number };
    err.statusCode = response.status;
    throw err;
  }
}

export async function POST(request: Request) {
  let payload: SendBagPayload = {};
  try {
    payload = (await request.json()) as SendBagPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Payload inválido." }, { status: 400 });
  }

  if (!enabled()) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      configured: false,
      message: "Avisos remotos ainda não configurados no servidor.",
    });
  }

  const admin = createClient(supabaseUrl!, serviceRoleKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  let query = admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, subscription_json, role, city_id, is_active")
    .eq("is_active", true)
    .eq("role", "motoboy");

  if (payload.cityId) query = query.or(`city_id.eq.${payload.cityId},city_id.is.null`);

  const { data, error } = await query.limit(200);
  if (error) return NextResponse.json({ ok: false, error: "Não foi possível buscar aparelhos para notificar." }, { status: 500 });

  const notificationPayload = JSON.stringify({
    title: "Nova Bag disponível",
    body: `${payload.establishmentName || "Um estabelecimento"} publicou uma Bag${payload.deliveriesCount ? ` com ${payload.deliveriesCount} entrega(s)` : ""}. Abra para aceitar.`,
    icon: "/icons/pwa-icon-v45-192.png",
    badge: "/icons/pwa-badge-v45-96.png",
    tag: payload.bagCode ? `bag-${payload.bagCode}` : "nova-bag",
    renotify: true,
    requireInteraction: true,
    url: "/motoboy?section=solicitacoes",
    data: { bagCode: payload.bagCode || null },
  });

  let sent = 0;
  let failed = 0;
  const expiredIds: string[] = [];
  await Promise.all(
    ((data || []) as StoredSubscription[]).map(async (row) => {
      try {
        await sendWebPush(row, notificationPayload);
        sent += 1;
      } catch (err: any) {
        failed += 1;
        if (err?.statusCode === 404 || err?.statusCode === 410) expiredIds.push(row.id);
      }
    }),
  );

  if (expiredIds.length) await admin.from("push_subscriptions").update({ is_active: false, updated_at: new Date().toISOString() }).in("id", expiredIds);
  return NextResponse.json({ ok: true, configured: true, sent, failed, expired: expiredIds.length });
}
