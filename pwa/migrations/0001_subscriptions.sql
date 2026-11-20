CREATE TABLE IF NOT EXISTS subscriptions (
  clerk_user_id TEXT PRIMARY KEY,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_end INTEGER,
  subscription_created INTEGER NOT NULL DEFAULT 0
);

