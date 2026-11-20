import { fail, handleError, hasPremiumAccess, ok, requireDatabase, requireUser } from "../../_lib/billing.js";

export async function onRequestGet({ request, env }) {
  try {
    const userId = await requireUser(request, env);
    if (!env.DODO_PRODUCT_ID) throw new Error("DODO_PRODUCT_ID is not configured.");
    const result = await requireDatabase(env).prepare(
      "SELECT status, current_period_end, past_due_ends_at FROM subscriptions WHERE clerk_user_id = ? AND dodo_product_id = ? ORDER BY event_created DESC"
    ).bind(userId, env.DODO_PRODUCT_ID).all();
    const subscriptions = result.results || [];
    const premium = subscriptions.some(row => hasPremiumAccess(row));
    const currentPeriodEnd = subscriptions
      .filter(row => hasPremiumAccess(row))
      .reduce((latest, row) => Math.max(latest, row.current_period_end || 0), 0) || null;
    return ok({
      premium,
      status: premium ? "active" : subscriptions[0]?.status || "free",
      currentPeriodEnd,
    });
  } catch (error) {
    if (error.status === 401) return fail(error.message, 401);
    return handleError(error);
  }
}
