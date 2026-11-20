import { dodoRequest, fail, handleError, ok, requireDatabase, requireUser } from "../../_lib/billing.js";

export async function onRequestPost({ request, env }) {
  try {
    const userId = await requireUser(request, env);
    if (!env.DODO_PRODUCT_ID) throw new Error("DODO_PRODUCT_ID is not configured.");
    const db = requireDatabase(env);
    const existing = await db.prepare(
      "SELECT dodo_customer_id, status, past_due_ends_at FROM subscriptions WHERE clerk_user_id = ? AND dodo_product_id = ? ORDER BY event_created DESC"
    ).bind(userId, env.DODO_PRODUCT_ID).all();
    const subscriptions = existing.results || [];
    if (subscriptions.some(subscription => subscription.status === "active" ||
      (subscription.status === "past_due" && subscription.past_due_ends_at > Date.now()))) {
      return fail("Your Premium subscription is already active. Manage it in Settings.", 409);
    }
    const customerId = subscriptions.find(subscription => subscription.dodo_customer_id)?.dodo_customer_id;

    const origin = new URL(request.url).origin;
    const product = await dodoRequest(env, `products/${encodeURIComponent(env.DODO_PRODUCT_ID)}`);
    const price = product.price;
    if (!product.is_recurring || price?.price !== 549 || price?.currency !== "USD" ||
      price?.payment_frequency_count !== 1 || price?.payment_frequency_interval !== "month" ||
      (price.discount_bps && price.discount_bps !== 0) || (price.discount && price.discount !== 0)) {
      return fail("Configure the Dodo product as USD $5.49 billed monthly before enabling checkout.", 503);
    }

    const checkout = {
      product_cart: [{ product_id: env.DODO_PRODUCT_ID, quantity: 1 }],
      subscription_data: { trial_period_days: 7 },
      metadata: { clerk_user_id: userId },
      return_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancel`,
    };
    if (customerId) checkout.customer = { customer_id: customerId };
    const session = await dodoRequest(env, "checkouts", { method: "POST", body: JSON.stringify(checkout) });
    if (!session.checkout_url) throw new Error("Dodo Payments did not return a Checkout URL.");
    return ok({ url: session.checkout_url });
  } catch (error) {
    if (error.status === 401) return fail(error.message, 401);
    if (error.status === 409) return fail(error.message, 409);
    return handleError(error);
  }
}
