import { requireDatabase, saveSubscription, timestamp } from "../_lib/billing.js";

const encoder = new TextEncoder();

function decodeBase64(value) {
  return Uint8Array.from(atob(value), character => character.charCodeAt(0));
}

function encodeBase64(value) {
  let binary = "";
  for (const byte of new Uint8Array(value)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function equalSignature(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function verifySignature(rawBody, headers, secret) {
  const id = headers.get("webhook-id");
  const timestampHeader = headers.get("webhook-timestamp");
  const signatureHeader = headers.get("webhook-signature") || "";
  const seconds = Number(timestampHeader);
  if (!id || !Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) return false;
  const signatures = signatureHeader.split(/\s+/).filter(value => value.startsWith("v1,")).map(value => value.slice(3));
  if (!signatures.length) return false;

  const encodedSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const key = await crypto.subtle.importKey("raw", decodeBase64(encodedSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signedPayload = `${id}.${timestampHeader}.${rawBody}`;
  const expected = encodeBase64(await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload)));
  return signatures.some(signature => equalSignature(expected, signature));
}

function response(body, status = 200) {
  return new Response(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function onRequestPost({ request, env }) {
  if (!env.DODO_PAYMENTS_WEBHOOK_KEY || !env.DODO_PRODUCT_ID || !env.DATABASE) {
    console.error("Dodo Payments webhook configuration is incomplete.");
    return response("Webhook is not configured.", 500);
  }

  const rawBody = await request.text();
  try {
    if (!(await verifySignature(rawBody, request.headers, env.DODO_PAYMENTS_WEBHOOK_KEY))) {
      return response("Invalid Dodo Payments signature.", 400);
    }
  } catch (error) {
    console.error("Dodo Payments signature verification failed:", error);
    return response("Invalid Dodo Payments signature.", 400);
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return response("Invalid event payload.", 400);
  }

  const webhookId = request.headers.get("webhook-id");
  try {
    const db = requireDatabase(env);
    const processed = await db.prepare(
      "SELECT webhook_id FROM processed_webhooks WHERE webhook_id = ?"
    ).bind(webhookId).first();
    if (processed) return response("ok");

    if (typeof event.type === "string" && event.type.startsWith("subscription.")) {
      const subscription = event.data;
      if (!subscription?.subscription_id) throw new Error("Subscription event is missing its subscription ID.");
      if (subscription.product_id === env.DODO_PRODUCT_ID) {
        const userId = subscription.metadata?.clerk_user_id;
        if (!userId) throw new Error(`Subscription ${subscription.subscription_id} is missing the account reference.`);
        const eventTime = timestamp(event.timestamp) || Number(request.headers.get("webhook-timestamp")) * 1000;
        await saveSubscription(db, userId, subscription, eventTime);
      }
    }
    await db.prepare(
      "INSERT OR IGNORE INTO processed_webhooks (webhook_id, created_at) VALUES (?, ?)"
    ).bind(webhookId, Date.now()).run();
    return response("ok");
  } catch (error) {
    console.error("Dodo Payments webhook processing failed:", error);
    return response("Webhook processing failed.", 500);
  }
}
