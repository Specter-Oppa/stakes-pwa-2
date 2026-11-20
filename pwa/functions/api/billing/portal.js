import { dodoRequest, fail, handleError, ok, requireDatabase, requireUser } from "../../_lib/billing.js";

export async function onRequestPost({ request, env }) {
  try {
    const userId = await requireUser(request, env);
    if (!env.DODO_PRODUCT_ID) throw new Error("DODO_PRODUCT_ID is not configured.");
    const customer = await requireDatabase(env).prepare(
      "SELECT dodo_customer_id FROM subscriptions WHERE clerk_user_id = ? AND dodo_product_id = ? ORDER BY event_created DESC"
    ).bind(userId, env.DODO_PRODUCT_ID).first();
    if (!customer?.dodo_customer_id) return fail("No Dodo Payments subscription was found for this account.", 404);
    const params = new URLSearchParams({ return_url: new URL(request.url).origin });
    const path = `customers/${encodeURIComponent(customer.dodo_customer_id)}/customer-portal/session?${params}`;
    const session = await dodoRequest(env, path, { method: "POST" });
    if (!session.link) throw new Error("Dodo Payments did not return a customer portal link.");
    return ok({ url: session.link });
  } catch (error) {
    if (error.status === 401) return fail(error.message, 401);
    if (error.status === 404) return fail(error.message, 404);
    return handleError(error);
  }
}
