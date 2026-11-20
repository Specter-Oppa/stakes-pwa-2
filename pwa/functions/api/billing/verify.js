import { dodoRequest, fail, handleError, hasPremiumAccess, ok, requireDatabase, requireUser, saveSubscription } from "../../_lib/billing.js";

export async function onRequestPost({ request, env }) {
  try {
    const userId = await requireUser(request, env);
    let body;
    try {
      body = await request.json();
    } catch {
      return fail("Request body must be valid JSON.");
    }
    if (typeof body.subscriptionId !== "string" || !body.subscriptionId.startsWith("sub_")) {
      return fail("A valid Dodo Payments subscription is required.");
    }
    const subscription = await dodoRequest(env, `subscriptions/${encodeURIComponent(body.subscriptionId)}`);
    if (subscription.metadata?.clerk_user_id !== userId) {
      return fail("This subscription does not belong to the signed-in account.", 403);
    }
    if (subscription.product_id !== env.DODO_PRODUCT_ID) {
      return fail("This subscription is not Stakes Premium.", 403);
    }
    await saveSubscription(requireDatabase(env), userId, subscription);
    if (!hasPremiumAccess(subscription)) return fail("Dodo Payments has not activated the subscription yet.", 409);
    return ok({ verified: true });
  } catch (error) {
    if (error.status === 401) return fail(error.message, 401);
    if (error.status === 403) return fail(error.message, 403);
    if (error.status === 409) return fail(error.message, 409);
    return handleError(error);
  }
}
