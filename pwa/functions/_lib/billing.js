import { verifyToken } from "@clerk/backend";

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
});

export function fail(message, status = 400) {
  return json({ error: message }, status);
}

export function ok(data) {
  return json(data);
}

export async function requireUser(request, env) {
  if (!env.CLERK_SECRET_KEY) throw new Error("Missing CLERK_SECRET_KEY configuration.");
  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    const error = new Error("Sign in to continue.");
    error.status = 401;
    throw error;
  }
  let claims;
  try {
    claims = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
      authorizedParties: [new URL(request.url).origin],
    });
  } catch {
    const error = new Error("Your sign-in session is invalid or expired.");
    error.status = 401;
    throw error;
  }
  if (!claims.sub) {
    const error = new Error("The sign-in token has no user identity.");
    error.status = 401;
    throw error;
  }
  return claims.sub;
}

export function requireDatabase(env) {
  if (!env.DATABASE) throw new Error("Billing database is not configured.");
  return env.DATABASE;
}

export async function dodoRequest(env, path, init = {}) {
  if (!env.DODO_PAYMENTS_API_KEY) throw new Error("Dodo Payments is not configured.");
  const base = env.DODO_PAYMENTS_ENVIRONMENT === "test_mode"
    ? "https://test.dodopayments.com"
    : env.DODO_PAYMENTS_ENVIRONMENT === "live_mode"
      ? "https://live.dodopayments.com"
      : null;
  if (!base) throw new Error("DODO_PAYMENTS_ENVIRONMENT must be test_mode or live_mode.");
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${env.DODO_PAYMENTS_API_KEY}`);
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`${base}/${path}`, { ...init, headers });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Dodo Payments returned a non-JSON response (HTTP ${response.status}).`);
  }
  if (!response.ok) throw new Error(data.message || data.code || `Dodo Payments returned HTTP ${response.status}.`);
  return data;
}

export function timestamp(value) {
  if (typeof value === "number") return value > 1e12 ? Math.floor(value) : Math.floor(value * 1000);
  if (typeof value !== "string") return null;
  if (/^\d+(\.\d+)?$/.test(value)) return timestamp(Number(value));
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function hasPremiumAccess(subscription, now = Date.now()) {
  if (subscription.status === "active") return true;
  return subscription.status === "past_due" && timestamp(subscription.past_due_ends_at) > now;
}

export async function saveSubscription(db, userId, subscription, eventCreated = Date.now()) {
  const customerId = subscription.customer?.customer_id || subscription.customer_id || null;
  await db.prepare(
    `INSERT INTO subscriptions
      (clerk_user_id, dodo_customer_id, dodo_subscription_id, dodo_product_id, status, current_period_end, past_due_ends_at, subscription_created, event_created)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(dodo_subscription_id) DO UPDATE SET
       clerk_user_id = excluded.clerk_user_id,
       dodo_customer_id = excluded.dodo_customer_id,
       dodo_product_id = excluded.dodo_product_id,
       status = excluded.status,
       current_period_end = excluded.current_period_end,
       past_due_ends_at = excluded.past_due_ends_at,
       subscription_created = excluded.subscription_created,
       event_created = excluded.event_created
     WHERE excluded.event_created >= subscriptions.event_created`
  ).bind(
    userId,
    customerId,
    subscription.subscription_id,
    subscription.product_id,
    subscription.status,
    timestamp(subscription.next_billing_date),
    timestamp(subscription.past_due_ends_at),
    timestamp(subscription.created_at) || 0,
    eventCreated,
  ).run();
}

export async function handleError(error) {
  console.error("Billing request failed:", error);
  return fail(error.status === 401 ? error.message : "The billing request could not be completed. Check the server configuration and try again.", error.status || 500);
}
