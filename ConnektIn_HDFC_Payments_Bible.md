# ConnektIn — HDFC SmartGateway Payments Bible

**Single source of truth for the ConnektIn subscription payment integration.**
Product: HDFC SmartGateway **HyperCheckout** (Web SDK), powered by Juspay Express Checkout.
Last updated: 13 Jun 2026 · Owner: Sen · Status: **v1 — pre-build, sandbox not yet started**

> Living document. Update it as decisions change. The one open item (Webhooks) is marked `TODO` at the bottom.

---

## 0. The one-line summary

ConnektIn subscriptions are paid on the **web** (connektin.in PWA) via HDFC's hosted HyperCheckout page. A Firebase Cloud Function creates the order and verifies it server-side; the verified result writes a subscription entitlement to Firestore. The Android TWA never handles payment — it just reads the entitlement.

---

## 1. Strategic decisions (the "why", not in HDFC's docs)

- **Web SDK only (Card 3).** We do NOT use the Android/iOS native SDKs. The Android app is a TWA wrapping connektin.in, so there's no native layer to integrate into — and putting payments inside the Play-distributed app would trigger Google Play Billing and risk the app being pulled.
- **Option C — payments live on the web.** A user subscribes on connektin.in *in a browser*. That's outside the Play app, so Google has no claim and takes nothing.
- **The TWA owns no payment code.** It reflects subscription state from Firestore. **No "Buy / Upgrade" button inside the TWA** (that's the Play policy line) — premium unlocks silently once entitlement is set.
- **One integration, ever** = the Web SDK. Never the native cards.

---

## 2. Timeline landmines (read before promising dates)

Two external approval clocks gate real launch. Neither is in our control once submitted — start both early.

1. **Google Play closed testing** — 14 continuous days with 12+ active testers before applying for production.
2. **HDFC restricted production mode** — the production account starts capped at **200 transactions/day and ₹10 max per transaction**. The cap is lifted only after integration is complete **and** the bank gives QA sign-off.
   - **Consequence:** the ₹117 quarterly subscription **cannot be charged** until the cap is lifted. "Payments built" ≠ "payments live."
   - **Action:** ask the HDFC contact now how long their QA sign-off typically takes, and bake that buffer into the launch date.

Firebase note: Cloud Functions require the **Blaze (pay-as-you-go)** plan. Confirm `connektin-phase2` is on Blaze before building.

---

## 3. Architecture / payment flow

```
PWA (connektin.in)        Cloud Function (Merchant Server)     HDFC SmartGateway
       |                              |                              |
  user taps "Subscribe"  --POST-->  createSession                    |
       |                              |--orderSession.create()------>|
       |                              |<------ payment_links.web -----|
       |<---- payment_links.web ------|                              |
  redirect browser to payment_links.web -------------------------->  (hosted pay page)
       |                              |        user pays on HDFC      |
       |<=== redirect to return_url (?status, order_id, signature) ==|
       |                              |                              |
  return_url handler -------------->  order.status(orderId)  ------->|
                                      verify order_id + AMOUNT        |
                                      write entitlement to Firestore  |
   (async safety net)  <== webhook (S2S) ===========================|
                                      write entitlement idempotently  |
```

**Golden rule:** never trust the browser redirect. Always re-verify with a server-side `order.status` call and check the amount before granting anything.

---

## 4. The SDK

- **Package:** `expresscheckout-nodejs` (npm). ⚠️ Do **not** use `expresscheckout-nodejs-sdk` — that's a stale 6-year-old personal mirror, not official.
- **Install:** `npm i expresscheckout-nodejs`
- **Import:** `const { Juspay, APIError } = require('expresscheckout-nodejs')`

**Base URLs**

| Environment | Base URL |
|---|---|
| Sandbox (UAT) | `https://smartgateway.hdfcuat.bank.in` |
| Production | `https://smartgateway.hdfc.bank.in` |

**Init**

```js
const juspay = new Juspay({
  merchantId: MERCHANT_ID,
  baseUrl: BASE_URL,            // sandbox vs prod
  jweAuth: {
    keyId: KEY_UUID,
    publicKey,                  // bank's public key (string)
    privateKey                  // YOUR private key (string)
  }
})
```

---

## 5. Security model (RSA / JWE)

- Requests are encrypted/signed with **JWE using RSA-2048** key pairs.
- **Two pairs total:** you generate yours; the bank generates theirs.
  - You share **your public key** (PEM) with the bank.
  - The bank gives you **their public key** + a **KEY_UUID**.
- Your **private key is the crown jewel** — server-side only, never in the client, never in the repo.
- Keys can be auto-generated on the SmartGateway Dashboard (Login → Payments → Settings → Security → JWT Keys → auto-generate) or locally with `openssl`.

**Firebase-specific (this is our adaptation, not in HDFC docs):**
- The sample reads keys from `.pem` file paths. On Cloud Functions we do NOT ship `.pem` files.
- Store **private key**, **bank's public key**, and **KEY_UUID** in **Firebase Secret Manager** and pass the strings straight into `jweAuth`. The SDK accepts key *content*, not just paths.

---

## 6. Create order session

```js
const sessionResponse = await juspay.orderSession.create({
  order_id: orderId,                  // see rules below — MANDATORY
  amount: "117",                      // string, max 2 decimals — MANDATORY
  payment_page_client_id: CLIENT_ID,  // sandbox: 'hdfcmaster'; prod: real merchant id — MANDATORY
  customer_id: firebaseUid,           // map to Firebase Auth UID — optional but use it
  action: 'paymentPage',              // default
  return_url: 'https://connektin.in/payment/return',  // fully-qualified
  currency: 'INR'
})
// then redirect the browser to: sessionResponse.payment_links.web
```

**`order_id` rules (easy to get wrong):**
- Under 21 characters
- Alphanumeric only, **no special characters**
- **Non-sequential** ← the sample's `order_${Date.now()}` VIOLATES this (timestamps are sequential)
- ✅ Use a short random id (e.g. 16-char nanoid). Store it in `orders/{orderId}` so the return handler/webhook can look up who paid for what.

**`amount` format:** stringified, up to 2 decimals. `"117"` and `"117.00"` valid; `"117.1532"` invalid.

**Useful optional params:** `customer_email`, `customer_phone`, `first_name`, `last_name`, `description`, `udf1`–`udf10` (user-defined fields visible in the dashboard).

**Sample response (web):**
```json
{
  "status": "NEW",
  "id": "ordeh_xxxxxxxxxxxx",
  "order_id": "your-order-id",
  "payment_links": { "web": "https://smartgateway.../merchant/ipay/.../payment-page" },
  "sdk_payload": { ... }   // for MOBILE SDKs — ignore on web
}
```

---

## 7. Return handler + verification (MANDATORY)

HDFC redirects the browser back to `return_url` with query params, e.g.:
```
?status_id=21&status=CHARGED&order_id=...&signature=...&signature_algorithm=HMAC-SHA256
```

**Do NOT trust these params.** The handler must:
1. Read `order_id`.
2. Call `await juspay.order.status(orderId)` (server-to-server).
3. **Verify `order_id` AND that `statusResponse.amount` matches the expected plan price** stored in `orders/{orderId}`. (This stops a tampered redirect faking a payment.)
4. Branch on status and write entitlement.

**Status values:**

| Status | Meaning | Action |
|---|---|---|
| `CHARGED` | Paid | Grant subscription |
| `PENDING` / `PENDING_VBV` | In progress | Show pending; wait for webhook |
| `AUTHORIZATION_FAILED` | Failed | Show failure |
| `AUTHENTICATION_FAILED` | Failed | Show failure |
| (other) | — | Treat as not-paid; log |

The success/pending/failure **status screen is ours to build** — the SDK does not provide one.

---

## 8. Firestore data model (proposed)

```
orders/{orderId}
  uid, plan, amount, currency, status ("NEW"|"CHARGED"|...),
  createdAt, updatedAt, txnId

users/{uid}/  (or users/{uid}.subscription)
  subscription: { status: "active"|"none", plan, startedAt, expiresAt }
```

- **Idempotency:** both the return handler and the webhook may fire for the same order. Writes must be idempotent — same `order_id` ⇒ same result, never double-grant.
- The TWA / PWA reads `users/{uid}.subscription` to unlock premium.

---

## 9. Sandbox → Production switch

| What | Sandbox | Production |
|---|---|---|
| Base URL | `smartgateway.hdfcuat.bank.in` | `smartgateway.hdfc.bank.in` |
| Key pair | sandbox keys | **new** prod key pair (regenerate) |
| KEY_UUID | sandbox UUID | prod UUID (after uploading prod public key) |
| `payment_page_client_id` | `hdfcmaster` | **real Merchant ID** |
| `merchant_id` | — | real Merchant ID from bank |

Plus: production starts in **restricted mode** (§2) until QA sign-off.

---

## 10. Known doc bugs (so we don't waste time)

- The "Download Node sample" link points to the **.NET** zip — wrong.
- Inline code snippets often render `{"success":false,"message":"Failed to fetch snippet"}` — broken on HDFC's side.
- The `.md` content links advertised in `llms.txt` return 503 / not-found.
- Source of truth for code: the official `expresscheckout-nodejs` npm package + Juspay GitHub samples.

---

## 11. Build plan (proposed)

**Phase 0 — Prereqs (blocking, do first)**
- [ ] Confirm `connektin-phase2` is on the Blaze plan
- [ ] Get Merchant ID / Client ID from the HDFC team
- [ ] Generate sandbox RSA key pair; upload public key to dashboard; download bank's public key + KEY_UUID
- [ ] Ask HDFC how long QA sign-off takes (feeds the launch date)

**Phase 1 — Sandbox build**
- [ ] Cloud Function: init Juspay from Secret Manager (sandbox keys, UAT base URL)
- [ ] `createSession` endpoint (fixed plan amount, random order_id, write `orders/{orderId}`)
- [ ] Frontend: "Subscribe" → call endpoint → redirect to `payment_links.web`
- [ ] Return handler: `order.status` + amount verify → write entitlement (idempotent)
- [ ] Status screens (success / pending / failure)
- [ ] Test end-to-end with sandbox test cards

**Phase 2 — Production hardening**
- [ ] Webhook handler (async safety net) — **needs the Webhooks doc page first** (TODO below)
- [ ] (Optional) HMAC signature verification on the return URL
- [ ] Switch config to production (new keys, prod URL, real merchant id)
- [ ] Submit for bank QA sign-off → cap lifted → real ₹117 charges enabled

---

## 12. TODO / open items

- [ ] **Webhooks page** — payload structure + signature verification not yet retrieved. Needed for the async safety net in Phase 2. (Fetch: SmartGateway docs → Web → Resources → Webhooks, "Copy as Markdown".)
- [ ] HMAC-SHA256 return-URL signature verification — details on the "HMAC Signature verification for return URL" page (optional but recommended).
- [ ] Confirm final subscription price/plan in code (currently ₹117 quarterly per the TherMite engagement doc).
- [ ] Decide the in-TWA "upgrade nudge" UX (link users out to connektin.in in a browser, since no in-app buy button is allowed).
