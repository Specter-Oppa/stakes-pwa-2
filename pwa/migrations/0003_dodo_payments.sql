ALTER TABLE subscriptions RENAME COLUMN stripe_customer_id TO dodo_customer_id;
ALTER TABLE subscriptions RENAME COLUMN stripe_subscription_id TO dodo_subscription_id;
ALTER TABLE subscriptions ADD COLUMN dodo_product_id TEXT NOT NULL DEFAULT '';
ALTER TABLE subscriptions ADD COLUMN past_due_ends_at INTEGER;

UPDATE subscriptions
SET event_created = event_created * 1000,
    subscription_created = subscription_created * 1000
WHERE event_created < 1000000000000;

DROP INDEX IF EXISTS subscriptions_stripe_customer_id;
CREATE INDEX subscriptions_dodo_customer_id ON subscriptions (dodo_customer_id);
CREATE INDEX subscriptions_dodo_product_id ON subscriptions (dodo_product_id);

CREATE TABLE IF NOT EXISTS processed_webhooks (
  webhook_id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);
