# Auth & Identity Module

Source: `src/features/auth/`. Mounted into the app at `app.use('/api', router)` (`src/app.js`) → `router.use('/v1', authFeatureRoutes)` (`src/routes/v1/index.js`) → `src/features/auth/index.js` re-exports `src/features/auth/routes/index.js`, which mounts `'/auth'`, `'/vendor/kyc'`, and `'/admin'`. **All paths below are already fully expanded, absolute paths** (e.g. `/api/v1/auth/admin/login`).

## Overview

This module provides identity-agnostic, strategy-pattern authentication shared by three separate identity collections — `User`, `Vendor`, `Admin` — via one controller/route factory bound to each `Model` at startup (`createAuthController({ Model, identity })` in `auth.controller.js`). Sessions are stateless JWTs: a short-lived access token (default 15m) and a longer refresh token (default 7d), both issued as **httpOnly cookies and returned in the JSON response body simultaneously**; the backend enforces a single active refresh token per actor (stored on the actor document, compared on every refresh) and blacklists the access token's `jti` in Redis on logout. Admins additionally carry a `subRole` (`SUPER_ADMIN` / `SUPPORT` / `FINANCE` / `OPS`) checked against a hardcoded, in-memory permission matrix (`resource → allowed actions`) — permissions are never stored per-admin-document, only resolved at request time. This module also owns the vendor KYC onboarding flow: a strict forward-only state machine (`draft → info_submitted → documents_submitted → bank_details_submitted → payment_completed → pending_verification → verified | rejected`) with a Razorpay payment step in the middle, plus admin-only KYC approve/reject and admin sub-role assignment endpoints gated by the permission system.

## Data models

### `Kyc` (`features/auth/models/kyc.model.js`) — the only model this module owns directly

| Field | Type | Notes |
|---|---|---|
| `vendor` | ObjectId ref `Vendor` | required, **unique** (1:1 with Vendor), indexed |
| `status` | enum `KYC_STATUS` | default `draft`, indexed |
| `info` | subdocument (step 1) | see below |
| `info.firstName` / `lastName` | String | required |
| `info.middleName` | String | optional |
| `info.dob` | Date | required |
| `info.email` | String | required, lowercased |
| `info.phoneNumber` | String | required |
| `info.occupation` | String | optional |
| `info.address` | ObjectId ref `Address` | optional — **cross-feature ref** into `features/address` |
| `documents` | subdocument (step 2) | see below |
| `documents.primaryDocument` | Document subdoc | required |
| `documents.secondaryDocument` | Document subdoc | optional |
| `documents.selfieImage` | String (URL) | required |
| *Document subdoc fields* | `type` (enum `DOCUMENT_TYPES`, required), `number` (String, required, upper-cased), `frontImage` (String URL, required), `backImage` (String URL, optional) | |
| `bankDetails` | subdocument (step 3) | see below |
| `bankDetails.accountHolderName` | String | required |
| `bankDetails.accountNumber` | String | required |
| `bankDetails.ifscCode` | String | required, upper-cased |
| `bankDetails.bankName` / `branchName` | String | optional |
| `paymentRef` | ObjectId ref `Transaction` | cross-feature ref (top-level `Transaction` model, not in this module); set once payment step 4 completes |
| `reviewedBy` | ObjectId ref `Admin` | set on approve/reject |
| `reviewedAt` | Date | set on approve/reject |
| `rejectionReason` | enum `REJECTION_REASONS` | only set on reject |
| `reviewComments` | String, max 1000 | optional, set on approve or reject |
| `history` | array of `{ status: enum KYC_STATUS, note, actorId: ObjectId, at: Date }` | appended on every transition; **`note`/`actorId` are declared on the schema but never populated by any service code** — every transition only ever sets `status` (see Ambiguous note below) |
| `createdAt` / `updatedAt` | Date | timestamps |

Indexes: unique on `vendor`; single-field on `status`; compound `{ status: 1, createdAt: -1 }`.

**Enums**
- `KYC_STATUS`: `draft`, `info_submitted`, `documents_submitted`, `bank_details_submitted`, `payment_completed`, `pending_verification`, `verified`, `rejected`
- `DOCUMENT_TYPES`: `passport`, `driving_license`, `national_id`, `voter_id`, `aadhaar`
- `REJECTION_REASONS`: `other`, `document_not_verified`, `incomplete`, `fraudulent`

**Ambiguous:** `history[].note` and `history[].actorId` are part of the schema but no code path in `kyc.service.js` ever sets them (`applyTransition` only pushes `{ status: to }`). Either dead schema fields or a planned-but-unfinished audit trail — don't rely on the frontend receiving a note/actor per history entry.

### `Admin` (`core/models/admin.model.js`)

| Field | Type | Notes |
|---|---|---|
| `username` | String | required, unique, lowercased — **not used for login** (see Endpoints) |
| `email` | String | required, unique, lowercased, email-format validated |
| `firstName` / `lastName` | String | required |
| `middleName` | String | optional |
| `password` | String | bcrypt-hashed on save (via `withAuth` plugin) — **not `select: false`**, see Frontend note below |
| `subRole` | enum `ADMIN_SUB_ROLES` | required, default `SUPPORT` |
| `isBlocked` | Boolean | default `false` |
| `avatar` | String | optional |
| `passwordResetToken` / `passwordResetExpiry` | String / Date | `select: false` |
| `refreshToken` | String | `select: false` (added by `withAuth` plugin) |
| `fullName` | virtual | `[firstName, middleName, lastName].filter(Boolean).join(' ')`, included in `toJSON`/`toObject` |
| `createdAt` / `updatedAt` | Date | timestamps |

Admin has **no soft-delete** (`withSoftDelete` is not applied) and **no referral fields** — unlike User/Vendor.

**Ambiguous:** `auth.routes.js` has a comment "Admins are provisioned by another admin (see admin.routes.js), not via public signup", but `admin.routes.js` only exposes sub-role assignment and KYC approve/reject — there is **no endpoint anywhere in this module that creates an Admin document**. Admin creation appears to happen out-of-band (seed script / direct DB write) — confirm with the backend owner before assuming a "create admin" endpoint exists or is planned.

### `User` (`core/models/user.model.js`) — fields relevant to auth (full model is broader, owned by other features)

| Field | Type | Notes |
|---|---|---|
| `phoneNumber` | String | required, unique, validated `+?[1-9]\d{1,14}` |
| `email` | String | optional, lowercased, validated if present |
| `firstName` / `lastName` / `middleName` | String | optional |
| `dob`, `avatar` | Date / String | optional |
| `password` | String | bcrypt-hashed, not `select: false` |
| `role` | String | default `'user'`, **immutable** — legacy field kept for ~18 other files that key off `user.role`; **new auth code does not use this field for identity**, identity comes from which collection the actor lives in |
| `isVerified`, `isEmailVerified`, `isMobileVerified`, `isBlocked` | Boolean | default `false` |
| `passwordResetToken`/`Expiry`, `refreshToken` | — | `select: false` |
| `isDeleted`, `deletedAt` | Boolean / Date | soft-delete plugin (`withSoftDelete`) |
| referral fields | — | via `withReferral` plugin, out of scope for this module |
| `addresses[]`, `bookings[]`, `wallet`, `membership`, `coupons[]` | ObjectId refs | owned by other features |
| `fullName` | virtual | same pattern as Admin |

### `Vendor` (`core/models/vendor.model.js`) — fields relevant to auth

Same auth-relevant shape as `User` (`phoneNumber` required, `email` optional, `password`, `role: 'vendor'` immutable/legacy, verification/blocked flags, soft-delete, referral), plus vendor-specific fields not owned by this module: `purpose`, `blockReason`, `serviceRadius` (default 5, 1–100 km), `isAvailable` (default `true`), `isOnline` (default `false`), `lastSeen`, `currentLocation` (GeoJSON `Point`, 2dsphere-indexed), `wallet`, `membership`. Virtual `fullName` same pattern.

`Vendor` also declares a virtual populate `servicemappings` (`ref: 'CatalogVendorService'`, `foreignField: 'vendor'`) — resolves to the service-catalog module's `VendorService` model (see `docs/features/service-catalog.md`), which now targets a Category or Subcategory per request, not a Service.

### KYC ↔ Vendor/Admin relationship

`Kyc.vendor` → `Vendor` (1:1, unique). `Kyc.reviewedBy` → `Admin`. `Kyc.info.address` → `Address` (features/address). `Kyc.paymentRef` → `Transaction` (top-level model, shared with the payments feature — KYC reuses the existing Razorpay order-creation utility and Transaction ledger rather than a parallel payment pipeline).

## Endpoints

### Auth routes — identical shape per identity, mounted 3×

`buildAuthRouter({ Model, identity, allowSignup, allowProfileUpdate })` in `auth.routes.js` is instantiated once per identity at `'/auth/user'` (`allowSignup: true`), `'/auth/vendor'` (`allowSignup: true`, `allowProfileUpdate: true`), `'/auth/admin'` (`allowSignup: false`). Every route below exists for **all three** identities except `signup` (`user`/`vendor` only) and `PATCH /me` (`vendor` only, currently). Replace `{identity}` with `user` / `vendor` / `admin`.

---
**POST `/api/v1/auth/{identity}/signup`** — `user` and `vendor` only, no admin route exists.
- Who: public
- Body (`signupSchema`): `provider` (enum of `AUTH_PROVIDERS`, optional, default `'email'`), `firstName`/`lastName` (string, optional), `email` (string, optional), `phoneNumber` (string, optional), `password` (string, min 8 max 128, required). Refined: at least one of `email`/`phoneNumber` required.
- Success: `201`
  ```json
  { "statusCode": 201, "data": { "accessToken": "<jwt>", "refreshToken": "<jwt>" }, "message": "Success", "success": true }
  ```
  Also sets `Set-Cookie: accessToken=...; HttpOnly` and `Set-Cookie: refreshToken=...; HttpOnly` (see Frontend notes for cookie attributes).
- Errors: `400` `"password is required"` / `"email or phoneNumber is required"` (strategy-level, only reachable if Zod's own refine somehow passes but the strategy re-checks); `409` `"Account already exists"` if a document matching `email` or `phoneNumber` already exists; `400` Zod validation failures (see generic shape below); `400` `"Unsupported auth provider: {provider}"` if an unregistered provider string is sent.

---
**POST `/api/v1/auth/{identity}/login`**
- Who: public
- Body (`loginSchema`): `provider` (enum `AUTH_PROVIDERS`, optional, default `'email'`), `identifier` (string, required — **email or phone number**, not a literal `email` field), `password` (string, required).
- Success: `200`, same body/cookie shape as signup (tokens only — **no profile/user data is returned by login**, see Frontend notes).
- Errors: `401` `"Invalid credentials"` (unknown identifier or password mismatch); `403` `"Account is blocked"` (`isBlocked: true`); `400` `"identifier and password are required"` (strategy-level guard); `400` Zod validation failures; `400` `"Unsupported auth provider: {provider}"`.
- **Only `provider: 'email'` is functional today.** `mobile_otp`, `google`, `github`, `linkedin` are registered in `AuthStrategyRegistry` but their `validate`/`authenticate` implementations throw `501 "{Provider} login is not available yet"` — confirmed by reading `mobileOtp.strategy.js` and `google.strategy.js` (github/linkedin follow the identical stub pattern by inspection of the shared `AuthStrategy` base class).

---
**POST `/api/v1/auth/{identity}/refresh`**
- Who: public (authenticates via the refresh token itself, not an access token)
- Body (`refreshTokenSchema`): `refreshToken` (string, **optional**) — if omitted, the value is read from the `refreshToken` httpOnly cookie instead (`req.cookies?.refreshToken || req.body?.refreshToken`).
- Success: `200`, identical shape to login — **a brand new access+refresh token pair is issued and the old refresh token is invalidated** (rotation: the actor's stored `refreshToken` is overwritten).
- Errors: `401` `"Refresh token missing"` (neither cookie nor body present); `401` `"{type} token expired"` / `"Invalid {type} token"` (JWT verify failure); `401` `"Refresh token mismatch — please login again"` (token is a validly-signed refresh token but doesn't match the one currently stored on the actor — happens if it was already rotated/used, or the actor logged in elsewhere since).

---
**GET `/api/v1/auth/{identity}/me`**
- Who: authenticated as that identity (any valid, non-blacklisted access token for that identity's collection — see **Ambiguous** note under Business rules about cross-identity access)
- Params/body: none
- Success: `200`
  ```json
  {
    "statusCode": 200,
    "data": {
      "_id": "665f1a2b3c4d5e6f7a8b9c0d",
      "username": "jane.admin",
      "email": "jane@company.com",
      "firstName": "Jane",
      "lastName": "Doe",
      "middleName": null,
      "subRole": "FINANCE",
      "isBlocked": false,
      "avatar": null,
      "fullName": "Jane Doe",
      "createdAt": "2026-01-10T08:00:00.000Z",
      "updatedAt": "2026-01-10T08:00:00.000Z",
      "permissions": {
        "wallets": ["READ", "UPDATE"],
        "orders": ["READ", "UPDATE"],
        "reports": ["READ", "EXPORT"]
      }
    },
    "message": "Success",
    "success": true
  }
  ```
  `password`, `refreshToken`, `passwordResetToken`, `passwordResetExpiry` are always excluded. `permissions` is **only attached for the `admin` identity** (derived from `ADMIN_SUB_ROLE_PERMISSIONS[subRole]` at request time, not stored) — the `/auth/user/me` and `/auth/vendor/me` variants return the same document shape without a `permissions` key.
- Errors: `401` `"Access token missing"` / `"Access token has been revoked"` / `"Invalid access token"` / `"access token expired"`; `403` `"Account is blocked"`; `404` `"Not found"` (actor deleted between token issue and this call).

---
**PATCH `/api/v1/auth/vendor/me`** — vendor only; no `/auth/user/me` or `/auth/admin/me` equivalent exists.
- Who: authenticated vendor
- Body (`updateProfileSchema`): all optional — `firstName`/`lastName`/`middleName` (1–50 chars), `email` (valid format), `phoneNumber` (regex `^\+?[1-9]\d{1,14}$`), `dob` (coerced date), `purpose` (≤500 chars), `serviceRadius` (number, 1–100), `isAvailable` (boolean). Any other key is stripped by Zod before it reaches the service layer.
- Success: `200`, the updated Vendor document (`password` excluded, same shape as `GET /me`), message `"Profile updated"`.
- Implementation: dispatches through `CoreAccessor.updateCoreFields('vendor', id, body)` → `updateVendorCoreFields`, which additionally allowlists against `VENDOR_CORE_FIELDS` (`core.accessor.js`) — so even a field this schema lets through (e.g. `isOnline`, which isn't in `updateProfileSchema` at all) would still only ever be set via a different caller, never this endpoint's body. `isOnline` is intentionally **not** in `updateProfileSchema` — it's meant to reflect real-time presence, not a vendor-editable preference.
- Errors: `404` `"Not found"` (actor deleted between token issue and this call); `400` Zod validation failures.

---
**POST `/api/v1/auth/{identity}/logout`**
- Who: authenticated
- Body (`logoutSchema`): `{}` (passthrough — any body accepted, nothing required)
- Success: `200`
  ```json
  { "statusCode": 200, "data": null, "message": "Logged out successfully", "success": true }
  ```
  Also blacklists the access token's `jti` in Redis for its remaining TTL, unsets the actor's stored `refreshToken`, and clears both cookies (`clearCookie('accessToken')`, `clearCookie('refreshToken')`).
- Errors: `401` (same as `/me`, since `authenticate` runs first).

---
**POST `/api/v1/auth/{identity}/forgot-password`**
- Who: public
- Body (`forgotPasswordSchema`): `email` (string, required, email format).
- Success: `200` always, regardless of whether the email exists — `{ "data": null, "message": "If this email is registered, a reset link has been sent." }` — deliberate to avoid leaking account existence.
- Errors: `400` Zod validation only (invalid email format). No 404 is ever returned for this endpoint by design.
- **Ambiguous:** the raw reset token is generated (`crypto.randomBytes(32)`) and hashed into `passwordResetToken`, but this module contains **no code that sends the token anywhere** (no email/SMS dispatch visible in `emailPassword.strategy.js`). Either delivery happens in an unread part of the codebase, or this is incomplete — the raw token never leaves the server in the current code path, so the reset flow as currently implemented cannot be completed by a real user without another mechanism.

---
**POST `/api/v1/auth/{identity}/reset-password`**
- Who: public
- Body (`resetPasswordSchema`): `token` (string, required — the raw token from forgot-password), `newPassword` (string, min 8 max 128, required).
- Success: `200`, same token-pair shape as login (the actor is logged in immediately with a fresh token pair after reset).
- Errors: `400` `"Invalid or expired password reset token"` (no matching non-expired token found); `400` `"token and newPassword are required"`.

---
**PATCH `/api/v1/auth/{identity}/change-password`**
- Who: authenticated
- Body (`changePasswordSchema`): `oldPassword` (string, required), `newPassword` (string, min 8 max 128, required). Refined: `newPassword !== oldPassword`.
- Success: `200`, `{ "data": null, "message": "Password changed. Please login again." }` — also clears both cookies, **forcing re-login** (no new tokens issued).
- Errors: `401` `"oldPassword is incorrect"`; `400` `"newPassword must differ from oldPassword"` (Zod refine, or re-checked at strategy level); `400` `"oldPassword and newPassword are required"`.

---

### KYC routes — mounted at `/api/v1/vendor/kyc`, gated to Vendor identity only

All routes: `router.use(authenticate, requireIdentity(IDENTITIES.VENDOR))` — an Admin or User access token gets `403 "Requires identity: vendor"` on every route in this group.

**GET `/api/v1/vendor/kyc/`**
- Who: authenticated vendor
- Success: `200`, the calling vendor's own `Kyc` document (populated `info.address`).
- Errors: `404` `"KYC record not found"` if the vendor has never started KYC (no draft auto-created on GET).

**POST `/api/v1/vendor/kyc/steps/info`** (step 1)
- Body (`kycInfoSchema`): `firstName` (2–50 chars, required), `lastName` (2–50, required), `middleName` (≤50, optional), `dob` (coerced date, required), `email` (required, valid email), `phoneNumber` (required, regex `^\+?[1-9]\d{1,14}$`), `occupation` (≤100, optional), `address` (24-hex ObjectId string, optional).
- Success: `200`, updated `Kyc` doc, `status` → `info_submitted`. **Auto-creates a `draft` Kyc record on first call** if none exists yet.
- Errors: `404` `"Address not found"` if `address` is provided but doesn't exist; `409` `"Cannot move KYC from \"{current}\" to \"info_submitted\""` if not currently `draft` (i.e. calling this endpoint twice is rejected the second time).

**POST `/api/v1/vendor/kyc/steps/documents`** (step 2)
- Body (`kycDocumentsSchema`): `primaryDocument` (required — `{ type: enum DOCUMENT_TYPES, number: 5–20 chars, frontImage: URL string, backImage?: URL string }`), `secondaryDocument` (optional, same shape), `selfieImage` (URL string, required).
- Success: `200`, `status` → `documents_submitted`.
- Errors: `404` `"KYC record not found"` (must have completed step 1 first — this endpoint does not auto-create); `409` if current status isn't `info_submitted`.

**POST `/api/v1/vendor/kyc/steps/bank-details`** (step 3)
- Body (`kycBankDetailsSchema`): `accountHolderName` (1–100, required), `accountNumber` (regex `^[0-9]{9,18}$`, required), `ifscCode` (regex `^[A-Z]{4}0[A-Z0-9]{6}$`, required, upper-cased), `bankName`/`branchName` (≤100, optional).
- Success: `200`, `status` → `bank_details_submitted`.
- Errors: `404` `"KYC record not found"`; `409` if current status isn't `documents_submitted`.

**POST `/api/v1/vendor/kyc/payment/initiate`** (step 4a)
- Body (`kycPaymentInitSchema`): `currency` (enum `["INR"]`, optional, default `"INR"`).
- Success: `201`
  ```json
  {
    "statusCode": 201,
    "data": {
      "transactionId": "665f...",
      "amount": 500,
      "razorpayOrder": { "id": "order_...", "amount": 50000, "currency": "INR", "...": "..." },
      "razorpayKeyId": "rzp_live_..."
    },
    "message": "KYC payment order created",
    "success": true
  }
  ```
  Does **not** change `Kyc.status` — it only validates the vendor is currently `bank_details_submitted`, creates a `pending` `Transaction` (`transactionFor: 'kyc_payment'`), and returns a Razorpay order to open on the client. Amount comes from `Setting.kycPrice` (global settings doc) or falls back to a hardcoded `500` if unset/unparseable.
- Errors: `404` `"KYC record not found"`; `409` `"Cannot move KYC from \"{current}\" to \"payment_completed\""` if current status isn't `bank_details_submitted` (this is the transition-table check used purely as a precondition guard here, not an actual transition).

**POST `/api/v1/vendor/kyc/payment/verify`** (step 4b)
- Body (`kycPaymentVerifySchema`): `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature` (all required strings) — the standard Razorpay checkout callback payload.
- Success: `200`, `status` transitions **twice in one call**: `bank_details_submitted → payment_completed → pending_verification`. Response is the updated `Kyc` doc.
- Errors: `404` `"KYC record not found"`; `409` if current status isn't `bank_details_submitted`; `400` `"Payment verification failed — invalid signature"` (HMAC-SHA256 signature mismatch); `404` `"Transaction not found for this order"` (no pending Transaction matches the Razorpay order id — shouldn't happen in the normal flow).

---

### Admin management routes — mounted at `/api/v1/admin`, all require `authenticate`

**PATCH `/api/v1/admin/:adminId/sub-role`**
- Who: authenticated admin with `checkPermission('admins', 'UPDATE')` — i.e. only `SUPER_ADMIN` by default (no other sub-role has any `admins` resource permission in the current matrix — see Business rules).
- Params: `adminId` (24-hex ObjectId).
- Body (`assignAdminSubRoleSchema`): `subRole` (enum `ADMIN_SUB_ROLES`, required).
- Success: `200`, the updated `Admin` document.
- Errors: `403` `"Admin access required"` (caller isn't an admin at all); `403` `"Insufficient permissions: UPDATE on admins"` (admin but wrong sub-role); `404` `"Admin not found"`; `400` Zod validation (invalid `adminId` format or `subRole` not in enum).

**POST `/api/v1/admin/kyc/:vendorId/approve`**
- Who: `checkPermission('kyc', 'APPROVE')` — by default: `SUPER_ADMIN` and `OPS`.
- Params: `vendorId` (24-hex ObjectId).
- Body (`approveKycSchema`): `comments` (string, ≤1000, optional).
- Success: `200`, updated `Kyc` doc, `status` → `verified`, `reviewedBy`/`reviewedAt`/`reviewComments` set.
- Errors: `403` permission errors as above; `404` `"KYC record not found"`; `409` `"Cannot move KYC from \"{current}\" to \"verified\""` if not currently `pending_verification` (this is the **only** status approve is allowed from).

**POST `/api/v1/admin/kyc/:vendorId/reject`**
- Who: `checkPermission('kyc', 'REJECT')` — by default: `SUPER_ADMIN` and `OPS`.
- Params: `vendorId` (24-hex ObjectId).
- Body (`rejectKycSchema`): `reason` (enum `REJECTION_REASONS`, required), `comments` (string, ≤1000, optional).
- Success: `200`, updated `Kyc` doc, `status` → `rejected`, `reviewedBy`/`reviewedAt`/`rejectionReason`/`reviewComments` set.
- Errors: same pattern as approve, `409` if not currently `pending_verification`.

## Business rules / state machines

**KYC status machine** — strictly forward-only, enforced centrally by `assertTransition` (`kyc.service.js`) against a static table (`KYC_TRANSITIONS` in `kyc.constants.js`); any call that doesn't match the current status's single allowed next state (or one of two, at the review step) throws `409`:

```
draft
  └─(steps/info)──────────────► info_submitted
                                    └─(steps/documents)───► documents_submitted
                                                                └─(steps/bank-details)──► bank_details_submitted
                                                                                              └─(payment/verify)──► payment_completed ──► pending_verification
                                                                                                                                              ├─(admin approve)──► verified   [terminal]
                                                                                                                                              └─(admin reject)───► rejected   [terminal]
```
- `payment/initiate` does **not** move the status forward — it only asserts the vendor is at `bank_details_submitted` and stands up a Razorpay order + pending Transaction.
- `payment/verify` moves the status forward twice in one request (`payment_completed` then immediately `pending_verification`) — there is no separate "submit for admin review" step once payment clears.
- `verified` and `rejected` are terminal — no code path transitions out of either. A rejected vendor has **no visible "resubmit" endpoint** in this module; re-entering the flow would require direct DB intervention or an unread feature elsewhere. Flag this to product/backend if resubmission is expected to be self-serve.
- One `Kyc` document per vendor for the vendor's lifetime (`vendor` field is unique) — there's no way to start a second KYC application even after rejection, since `getOrCreateDraft` only creates when none exists at all.

**Admin permission matrix** (`permissions.constants.js`, `ADMIN_SUB_ROLE_PERMISSIONS`) — resolved at request time from `subRole`, never stored:

| subRole | resources → allowed actions |
|---|---|
| `SUPER_ADMIN` | **all** resources (`users`, `vendors`, `kyc`, `bookings`, `orders`, `wallets`, `reports`, `settings`, `admins`) × **all** actions (`READ`, `CREATE`, `UPDATE`, `DELETE`, `BLOCK`, `APPROVE`, `REJECT`, `EXPORT`) |
| `SUPPORT` | `users`: READ, UPDATE, BLOCK · `vendors`: READ, UPDATE, BLOCK · `kyc`: READ |
| `FINANCE` | `wallets`: READ, UPDATE · `orders`: READ, UPDATE · `reports`: READ, EXPORT |
| `OPS` | `bookings`: READ, UPDATE, APPROVE · `vendors`: READ, UPDATE · `kyc`: READ, APPROVE, REJECT |

Only `SUPER_ADMIN` can reassign sub-roles (`admins:UPDATE`) or touch `settings`/`users:DELETE`/etc. — anything not explicitly listed for a sub-role is denied. This table currently only gates the two admin-management routes above (`checkPermission` isn't used anywhere else in this module) — other modules presumably call `checkPermission` themselves for their own resources (e.g. `wallets`, `bookings`).

**Token lifecycle** — access token TTL defaults to `15m`, refresh token to `7d` (env-overridable: `ACCESS_TOKEN_EXPIRY`, `REFRESH_TOKEN_EXPIRY`). Every login/refresh/signup/reset-password issues a **new pair** and overwrites the actor's stored `refreshToken` — meaning **logging in on a second device invalidates the first device's refresh token** (single active refresh token per actor, not per device/session). Logout blacklists only the access token's `jti` in Redis (for its remaining TTL) and clears the stored refresh token; it does not blacklist the refresh token's own `jti` separately, but since the stored `refreshToken` is unset, `refresh` will already reject it as a mismatch (`401 "Refresh token mismatch"`).

**Ambiguous — cross-identity access:** the `authenticate` middleware trusts whatever `identity` was embedded in the JWT at issue time (`decoded.identity`) and loads `req.user` from that identity's collection — it does **not** verify that this matches the identity the mounted route is bound to. Concretely, nothing stops a Vendor's valid access token from being sent to `POST /api/v1/auth/admin/logout` or `GET /api/v1/auth/admin/me`; the bound `Model` there is `Admin`, so `Admin.findById(<vendor's _id>)` almost always returns nothing (`404`) since MongoDB ObjectIds essentially never collide across collections — but this is coincidental safety, not an enforced check. Only the KYC routes (`requireIdentity(IDENTITIES.VENDOR)`) and the admin-management routes (`checkPermission` implicitly requiring `req.identity === 'admin'`) explicitly verify identity. Confirm whether this is an accepted risk or a gap to close.

**Error envelope inconsistency:** success responses (`ApiResponse`) use the key `statusCode`; error responses (`globalErrorHandler` → `errorResponse`) use the key `status` instead, and never include a `statusCode` key. Frontend error handling must check `error.status`, not `error.statusCode`, on failed requests. See exact shapes below.

## Frontend integration notes

**Base URL:** all paths above are relative to the API root; combined they are `/api/v1/auth/...`, `/api/v1/vendor/kyc/...`, `/api/v1/admin/...`.

**Where the access token goes:** `authenticate` middleware (`middlewares/authenticate.js`) reads it from **either** the `accessToken` httpOnly cookie **or** an `Authorization: Bearer <token>` header — cookie is checked first. Since the cookie is httpOnly, JS can't read or set it directly; the browser attaches it automatically on same-site requests as long as the client sends `credentials: 'include'` (fetch) / `withCredentials: true` (axios). CORS is configured with `credentials: true` and `exposedHeaders: ['Set-Cookie']`, so cross-origin cookie flow is supported for whitelisted origins (`allowedOrigins` in `config/constants.js`). Sending the `Authorization` header too is harmless and works as a fallback.

**Cookie attributes** (`token.constants.js`): `httpOnly: true`, `secure: NODE_ENV === 'production'` (false in dev — works over plain HTTP locally), `sameSite: 'strict'`, `maxAge` = 15m (access) / 7d (refresh) in milliseconds.

**What triggers a refresh:** nothing server-side pushes a refresh — the frontend must call `POST /api/v1/auth/{identity}/refresh` itself, typically from a 401 response interceptor (retry-once pattern), or proactively before the known 15-minute access token expiry. No refresh token needs to be sent explicitly if cookies are working (it's read from the cookie); pass `{ refreshToken }` in the body only if you're deliberately not relying on cookies.

**What to do on 401:** distinguish by `message`: `"Access token missing"` / `"...expired"` / `"Invalid access token"` / `"Access token has been revoked"` → attempt one refresh, then retry the original request; if refresh itself 401s (`"Refresh token missing"` or `"Refresh token mismatch — please login again"`), the session is truly over — clear local state and redirect to login. A `403 "Account is blocked"` is not recoverable by refreshing.

**No profile data from login/signup/refresh/reset-password** — these four endpoints return tokens only. The frontend must call `GET /api/v1/auth/{identity}/me` separately (immediately after login, and on app load to restore a session from the cookie) to get the actor's profile, and — for admins — their `subRole` and computed `permissions` map for client-side route/UI gating. Treat client-side permission checks as UX-only, not security — the server re-checks `checkPermission` independently on protected routes.

**Success envelope:** `{ statusCode, data, message, success: true }`. **Error envelope:** `{ success: false, status, message, errors?: [{ field, message }] }` (the `errors` array key is present only for Zod validation failures via the shared `validate` middleware; most business-rule errors — invalid credentials, wrong KYC transition, permission denied — have no `errors` array, just `message`). In development (`NODE_ENV=development`) errors also include a `details: { stack, errorType }` key — do not rely on it existing in production.

**Read-only / computed fields:** `fullName` (virtual, never accept it as input), `Kyc.status`/`Kyc.history`/`Kyc.reviewedBy`/`Kyc.reviewedAt` (only ever set by the server-side transition logic, never accept from client body — the validators for the step-submission endpoints don't even include these fields, so sending them is simply ignored), `Admin.permissions` (only present on the `/auth/admin/me` response, computed from `subRole`, not stored or settable directly — the only way to change effective permissions is changing `subRole` via `PATCH /api/v1/admin/:adminId/sub-role`).

**No pagination/filtering in this module** — every endpoint here operates on a single actor's own record or a single target by id; there is no "list all admins" or "list all KYC records" endpoint in this module (bulk/listing views for KYC review queues, if they exist, would live in another module — not found here).

**Provider field:** always send `provider: 'email'` explicitly or omit it (defaults to `'email'`) for login/signup today — every other provider value is accepted by validation but rejected at `501` by the strategy layer.
