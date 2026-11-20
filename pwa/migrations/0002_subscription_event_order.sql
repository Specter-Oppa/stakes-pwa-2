ALTER TABLE subscriptions RENAME TO subscriptions_legacy;

CREATE TABLE subscriptions (
  clerk_user_id TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  current_period_end INTEGER,
  subscription_created INTEGER NOT NULL DEFAULT 0,
  event_created INTEGER NOT NULL DEFAULT 0
);

INSERT INTO subscriptions
  (clerk_user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end, subscription_created, event_created)
SELECT clerk_user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end, subscription_created, subscription_created
FROM subscriptions_legacy;

DROP TABLE subscriptions_legacy;

CREATE INDEX subscriptions_clerk_user_id ON subscriptions (clerk_user_id);
CREATE INDEX subscriptions_stripe_customer_id ON subscriptions (stripe_customer_id);
