# Stakes (React PWA)

## Run locally

```
npm install
npm run build
npm run d1:migrate:local
npm run pages:dev  # http://localhost:8788 (serves Pages Functions)
```

Vite's `npm run dev` is also available for UI-only work; billing endpoints run through `wrangler pages dev`.

## Cloudflare Pages and Dodo Payments setup

The app uses Clerk for sign-in, Dodo Payments hosted checkout for recurring billing, Dodo webhooks for subscription updates, and Cloudflare D1 for subscription status. Checkout is **$5.49 USD per month after a 7-day free trial**.

1. Create a Clerk application and enable the sign-in methods you want. Copy the publishable key into `.env` as `VITE_CLERK_PUBLISHABLE_KEY=...`.
2. In Dodo Payments, create a **USD $5.49 recurring monthly** subscription product. Set the subscription period to 20 years so it renews until canceled, and note the product ID. The app applies the 7-day free trial when it creates checkout sessions.
3. Create a D1 database named `stakes-subscriptions` with `npm run d1:create`. Replace the placeholder `database_id` in `wrangler.toml` with the ID printed by Wrangler, then run `npm run d1:migrate:remote`.
4. Configure the local settings in `.dev.vars` (copy `.dev.vars.example`): use a Dodo API key for the selected mode, the product ID, `DODO_PAYMENTS_ENVIRONMENT=test_mode` for testing or `live_mode` for production, the Dodo webhook signing key, and `CLERK_SECRET_KEY`. Give the API key Products read, Checkouts write, Customers write, and Subscriptions read permissions.
5. In Dodo Payments, create a webhook endpoint at `https://<your-pages-domain>/api/dodo-webhook` and subscribe to the subscription lifecycle events: `subscription.active`, `subscription.updated`, `subscription.past_due`, `subscription.on_hold`, `subscription.paused`, `subscription.unpaused`, `subscription.renewed`, `subscription.cancelled`, `subscription.failed`, and `subscription.expired`. Save its signing key as `DODO_PAYMENTS_WEBHOOK_KEY`.
6. In Cloudflare, create the Pages project `stakes-pwa`, bind the D1 database as `DATABASE`, and set the Pages build command to `npm run build` with output directory `dist`. Set `VITE_CLERK_PUBLISHABLE_KEY`, `DODO_PRODUCT_ID`, and `DODO_PAYMENTS_ENVIRONMENT` as Pages variables.
7. Add the server-side secrets with Wrangler (never put these in Vite variables or source files):

   ```
   npx wrangler pages secret put CLERK_SECRET_KEY --project-name stakes-pwa
   npx wrangler pages secret put DODO_PAYMENTS_API_KEY --project-name stakes-pwa
   npx wrangler pages secret put DODO_PAYMENTS_WEBHOOK_KEY --project-name stakes-pwa
   ```

8. Publish Terms and Privacy pages and configure their URLs in Dodo before enabling live checkout. Deploy with `npm run deploy`. Sign in to Cloudflare with `npx wrangler login` first. Verify checkout with Dodo test-mode keys and a test webhook, then use live keys and a live webhook when ready to accept charges.

The publishable Clerk key is public by design. Keep Clerk secret, Dodo API, and webhook signing keys out of the browser and repository. Cloudflare account access and the keys must be configured by the account owner; the project cannot be deployed or accept real payments until those external setup steps are complete.

- `public/manifest.json` makes it installable (Add to Home Screen / Install app). It needs HTTPS in production (localhost is fine).
- `public/sw.js` caches the app shell so it opens offline. It only registers in production builds.
- Icons are in `public/icons/`; the logo component is `src/Logo.jsx`.
