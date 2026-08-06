# Service Hub — Backend

REST API powering the Service Hub marketplace: a service-catalog + product-catalog
platform connecting **customers**, **vendors**, and **admins**. This backend serves both
the [admin panel](../service-hub-admin) and the [customer site](../service-hub-customer).

## Tech Stack

| Category | Library |
|---|---|
| Runtime / Framework | Node.js (ESM, `"type": "module"`), Express 4.18 |
| Database | MongoDB via Mongoose 8 (+ `mongoose-aggregate-paginate-v2`) |
| Cache / token store | Redis via `ioredis` (access-token denylist, dashboard cache) |
| Validation | Zod (all `src/features/**`); Joi / `express-validator` present but only used by legacy, unmounted code |
| Auth | `jsonwebtoken` (access + refresh JWTs), `bcrypt` |
| Payments | `razorpay` |
| Object storage | `@aws-sdk/client-s3` + presigned URLs — AWS S3 (legacy uploads) and Cloudflare R2 (service-catalog media) |
| Realtime | `socket.io` (+ `socket.io-redis`) |
| Push / messaging | `firebase-admin`, `nodemailer`, `twilio` |
| Docs | `swagger-jsdoc` / `swagger-ui-express`, served at `/api-docs` |
| Observability | `@sentry/node`, `winston` + `@logtail/winston` |
| Scheduling | `node-cron` |
| AI (misc integrations) | `@google/genai`, `openai`, `@gradio/client` |

## Architecture Overview

The codebase contains **two parallel trees**, and only one of them is live:

- **`src/features/*`** — the active, mounted codebase. Every feature is a self-contained
  vertical slice (`controllers/`, `services/`, `models/`, `routes/`, `validators/`,
  `constants/`). This is what actually answers HTTP requests.
- **`src/controllers/`, `src/routes/*.routes.js` (non-`v1`), and most of `src/services/`** —
  an older, non-feature-folder implementation. `src/app.js` imports the old aggregator
  (`src/routes/routes.js`) but **every mount line for it is commented out**. None of this
  code is reachable over HTTP; it's dead code left in the tree, not a second live surface.
  Some of its models (`Product`, `Counter`, `Address`'s legacy sibling, etc.) are still
  imported by the live features, so `src/models/` is *not* fully dead — only the old
  controllers/routes/services layer is.

Mount chain for everything live: `src/app.js` → `app.use('/api', router)` where `router`
is `src/routes/v1/index.js`, which mounts each `src/features/<name>/index.js` under its
own prefix.

## Implemented Features

| Domain | Route prefix | Notes |
|---|---|---|
| **Auth & Identity** | `/api/v1/auth/{user,vendor,admin}/*` | One strategy-pattern controller shared by three identity collections. JWT access (15m) + refresh (7d), both as httpOnly cookies. Single active refresh token per actor (login elsewhere invalidates it); logout blacklists the access token's `jti` in Redis. **Only `provider: "email"` works** — mobile OTP, Google, GitHub, LinkedIn are registered strategies that currently return `501 Not available yet`. |
| **Vendor KYC** | `/api/v1/vendor/kyc/*` | Forward-only state machine: `draft → info_submitted → documents_submitted → bank_details_submitted → payment_completed → pending_verification → verified \| rejected`, with a Razorpay payment step mid-flow. `verified`/`rejected` are terminal — no resubmit endpoint. |
| **Admin management** | `/api/v1/admin/*` | Sub-role assignment (`SUPER_ADMIN`/`SUPPORT`/`FINANCE`/`OPS`) and KYC approve/reject, gated by a hardcoded in-memory permission matrix (resource × action), resolved per-request from `subRole` — not stored per-admin. No endpoint creates an Admin; that's out-of-band via `scripts/seedRootAdmin.js`. |
| **Addresses** | `/api/v1/addresses/*`, `/api/v1/users/me/addresses/*` | Polymorphic `Address` model (`owner` + `ownerType`), shared between `User` and `Vendor`. |
| **Service Catalog** | `/api/v1/service-catalog/*` | 4-level admin-managed hierarchy: `Category → Subcategory → ServiceGroup → Service`. Ancestor IDs are denormalized and server-derived via `pre('save')` hooks. Hard delete-safety guards (`409`) at every level — e.g. a Category with any Subcategory can't be deleted. `AddOn` links to exactly one of `Service`/`ServiceGroup` (XOR, enforced at both Zod and Mongoose layers). `VendorService` is a pending→approved/rejected request workflow letting vendors ask to offer a fixed-price Service. Admin image uploads go through a presigned-URL flow direct to Cloudflare R2 (`/media/presigned-url`). |
| **Product Catalog** | `/api/v1/products/*`, `/api/v1/products/categories/*` | Separate `Product` + `ProductCategory` tree (dedicated category system, not shared with services). Public browse, admin CRUD, soft-delete only (no cascade guards — `Product` is snapshot-protected in past orders instead). |
| **Customer profile & admin user mgmt** | `/api/v1/users/*`, `/api/v1/admin/users/*` | Self-service profile get/update/change-password; admin list/get/block/deactivate users. |
| **Cart & Checkout** | `/api/v1/cart`, `/api/v1/checkout`, `/api/v1/orders`, `/api/v1/admin/orders`, `/api/v1/admin/payments` | One mixed cart holds both `service` and `product` items. Checkout re-validates everything server-side (never trusts client cart state), splits items by type, and — inside one Mongo transaction — creates a `ServiceOrder` and/or `ProductOrder` (Mongoose discriminators on a shared `CustomerOrder` base) with a **snapshot** of price/name/address at time of order, backed by a single Razorpay payment. |
| **Payments** | `/api/v1/payments/verify` (client) + `/api/webhooks/razorpay` (webhook, source of truth) | `PaymentEvents` is an in-process pub/sub registry — features that create a Payment (currently only `cart`) register `onPaid`/`onFailed`/`onRefunded` handlers keyed by `purposeType`, so `payment` never imports its callers back. Admin refund (`POST /api/v1/admin/payments/:id/refund`) calls the real Razorpay refund API — code-complete, but there's no evidence in the code of it having been exercised against live Razorpay credentials. |
| **Service Booking (admin ops)** | `/api/v1/admin/service-orders/:id/assign-vendor` | The only route this module owns — customer-facing list/detail/cancel and generic admin list/status-update live in `cart` against the shared `CustomerOrder` model. |
| **Product Order fulfillment** | `/api/webhooks/shiprocket` | Shiprocket shipment-status webhook. The adapter's field names (`awb`, `current_status`, etc.) are flagged in-code as a **best-effort guess pending real Shiprocket docs** — treat as unverified against a real Shiprocket account. No authenticated routes of its own; order read/cancel goes through `cart`. |
| **Search** | `/api/v1/search` | Parallel search across `Category`, `Subcategory`, `Service` — Mongo `$text` index for queries ≥3 chars, case-insensitive regex fallback for shorter queries, prefix-match re-ranking. `products` is always returned as an empty array — Product isn't wired into search yet. |
| **Vendor Leads** | `/api/v1/vendor-leads` | Public, IP-rate-limited (5/15min) interest form. This is a standalone `Lead` model, not real vendor onboarding — there is no vendor self-signup site yet. |
| **Dashboard** | `/api/v1/admin/dashboard/*` | `summary`, `revenue-trend`, `category-performance`, `action-needed`, `recent-activity` — real Mongo aggregations (not mock data), Redis-cached. Open to any authenticated admin regardless of sub-role. |

## API Route Reference

| Prefix | Feature |
|---|---|
| `/api/v1/auth/user/*`, `/vendor/*`, `/admin/*` | Auth (signup/login/refresh/me/logout/password reset) |
| `/api/v1/vendor/kyc/*` | Vendor KYC onboarding |
| `/api/v1/admin/*` | Admin sub-role assignment, KYC approve/reject |
| `/api/v1/addresses/*` | Address CRUD |
| `/api/v1/service-catalog/{categories,subcategories,service-groups,services,add-ons,vendor-services,media}` | Service catalog |
| `/api/v1/products/*`, `/api/v1/products/categories/*` | Product catalog |
| `/api/v1/users/*`, `/api/v1/admin/users/*` | Customer profile + admin user management |
| `/api/v1/cart`, `/api/v1/checkout`, `/api/v1/orders` | Customer cart/checkout/orders |
| `/api/v1/admin/orders`, `/api/v1/admin/payments` | Admin order & payment management |
| `/api/v1/payments/verify` | Client-side payment verification |
| `/api/webhooks/razorpay` | Razorpay webhook (raw body, mounted outside `/api/v1`) |
| `/api/v1/admin/service-orders/:id/assign-vendor` | Vendor assignment on a service order |
| `/api/webhooks/shiprocket` | Shiprocket shipment webhook (raw body) |
| `/api/v1/search` | Cross-catalog search |
| `/api/v1/vendor-leads` | Vendor interest form |
| `/api/v1/admin/dashboard/*` | Admin dashboard aggregations |
| `/api-docs` | Swagger UI |
| `/health`, `/` | Health check |

## Environment Variables

Pulled from `.env.example`. Only the actively-used ones are marked required — most
integration keys are read by code paths that degrade or simply aren't invoked if unset.

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | yes | `development` / `production` |
| `PORT` | yes | API port (default `8000`) |
| `SERVER_URL`, `FRONTEND_URL` | yes | Used for CORS / links in emails |
| `DATABASE_URL` | **yes** | MongoDB connection string |
| `REDIS_URL` | yes | Defaults to `redis://localhost:6379` if unset; used for access-token denylist + dashboard cache |
| `ACCESS_TOKEN_SECRET` / `ACCESS_TOKEN_EXPIRY` | **yes** | JWT access token (expiry defaults `15m`) |
| `REFRESH_TOKEN_SECRET` / `REFRESH_TOKEN_EXPIRY` | **yes** | JWT refresh token (expiry defaults `7d`) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | **yes** (for payments/KYC payment) | Razorpay integration |
| `EMAIL_API_KEY`, `EMAIL_APP_PASSWORD`, `SENDER_EMAIL` | optional | Outbound email |
| `ACCOUNT_SID`, `AUTH_TOKEN`, `TWILIO_NUMBER` | optional | Twilio SMS (legacy code path) |
| `GOOGLE_MAP_API_KEY` | optional | Google Maps |
| `GEMINI_API_KEY`, `NEBIUS_API_KEY` | optional | AI integrations |
| `FIREBASE_*` (client + admin SDK, 15 vars) | optional | Push notifications |
| `SMS_BASE_URL`, `SMS_USER`, `SMS_PASSWORD`, `SMS_SENDER_ID`, `SMS_CHANNEL`, `SMS_ROUTE` | optional | Custom SMS gateway |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET_NAME`, `AWS_CLOUDFRONT_URL` | optional | S3 (legacy upload paths) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | **yes** (for service-catalog media uploads) | Cloudflare R2 |
| `MIGRATE_MONGO_URI`, `MIGRATE_AUTOSYNC` | optional | DB migration tooling |

## Setup & Run

```bash
git clone <repo-url>
cd service-hub-backend
npm install
cp .env.example .env.development   # fill in DATABASE_URL, JWT secrets, Razorpay, R2 at minimum
```

Start the dev server (nodemon, `NODE_ENV=development`):

```bash
npm run dev
```

Production start:

```bash
npm start
```

Other scripts:

```bash
npm run build    # syntax-check all source files (scripts/checkSyntax.mjs)
npm run format   # prettier --write
```

### Seed data

Standalone scripts, each connecting to the same `DATABASE_URL` the app uses. Run in this
order — later scripts depend on earlier ones (an Admin document, catalog data, etc.):

```bash
node scripts/seedRootAdmin.js --email you@example.com --username rootadmin   # provisions the first SUPER_ADMIN (password printed once)
node scripts/seedCatalog.js     # Category -> Subcategory -> ServiceGroup -> Service + AddOns
node scripts/seedProducts.js    # ProductCategory + Product
node scripts/seedUsers.js       # 10 demo customer Users + Addresses (passwords printed to console)
node scripts/seedOrders.js      # Cart / CustomerOrder / Payment demo data (needs the above)
```

All seed scripts run through the real Mongoose models, so schema hooks (slug generation,
password hashing, order-number counters) fire exactly as they do in the live app.

## Known Gaps / Not Yet Implemented

- **Legacy code is not live.** `src/controllers/`, most of `src/routes/` (everything
  except `src/routes/v1/`), and most of `src/services/` (booking, wallet, coupon,
  rating, banner, notification, commission, etc.) exist in the tree but are never
  mounted — `src/app.js` has every legacy route commented out. Treat this as dead
  reference code, not a second API surface.
- **Membership** — `membership` fields exist on the `User`/`Vendor` models and
  `Membership`/`MembershipPlan` models exist under `src/models/`, but there is no
  membership feature module, no routes, and no business logic anywhere in
  `src/features/`. Future scope only.
- **Wallet** — same situation: a `Wallet` model and `WALLETS` permission resource exist,
  but no live wallet feature/routes.
- **Product search** — `/api/v1/search` always returns `products: []`; Product isn't
  wired into the search index.
- **Password reset delivery is incomplete** — `forgot-password` generates and hashes a
  reset token, but no code path in the auth module actually emails or texts it to the
  user, so the flow can't be completed end-to-end as currently implemented.
- **OTP / social login are stubs** — `mobile_otp`, `google`, `github`, `linkedin`
  strategies are registered but return `501 Not available yet`; only email/password
  auth works.
- **KYC has no resubmit path** — a `rejected` vendor cannot restart KYC through the API.
- **Shiprocket integration is unverified** — the webhook payload shape is a best-effort
  guess pending real API docs, not confirmed against a live Shiprocket account.
- **Refund flow is code-complete but unproven** — calls the real Razorpay refund API;
  no indication in the code of it having been tested against live credentials.
- **`bookingExpirationScheduler`** starts on every server boot (`src/index.js`) and
  operates on the legacy, unmounted `Booking` model — since nothing creates a `Booking`
  document anymore (bookings now go through `CustomerOrder`/`ServiceOrder`), this job
  currently has nothing to do.
- **No multi-tenancy.**
