# Stage 1b — Vercel environment variable manifest

**Audience:** David, executing the first production deploy from Sam's Vercel account.
**Companion to:** `deployment-checklist.md` (Sam-facing, non-technical) — this doc is the technical paste sheet.

This manifest lists every environment variable the code reads (verified by greppable `process.env.` references in `lib/`, `app/`, and `scripts/`), where to source each value, which Vercel environments to assign it to, and the exact CLI / dashboard steps to set it.

Phase 1 variables only. Phase 2 (TrueLayer) and Phase 3 (fulfilment) variables are listed separately at the bottom for reference but **must remain unset until those phases start** — the payment provider abstraction in `lib/payments/index.ts` defaults to `stub` when `PAYMENT_PROVIDER` is undefined.

---

## Pre-flight checklist (before adding any env vars)

| Item | Where | Status check |
|---|---|---|
| Firebase project created in `europe-west2` | Sam's Firebase console | Project ID = `cryogene-5ee94` (auto-suffixed because the bare `cryogene` ID was unavailable globally — confirmed 2026-05-01) |
| Firestore Database enabled, **production mode** | Firebase console → Firestore | Region: europe-west2 |
| Firebase Storage enabled | Firebase console → Storage | Region: europe-west2 |
| Firebase Authentication enabled, **Email/Password provider** on | Firebase console → Authentication → Sign-in method | Email/Password toggle = on |
| Service account JSON downloaded | Firebase console → Project settings → Service accounts → Generate new private key | File saved locally, **never committed**, transferred to David via Signal/1Password if Sam generated it |
| Resend account created, domain verified | resend.com → Domains | DNS records on `cryogenelaboratories.co.uk` propagated, status: Verified |
| Resend API key issued | resend.com → API Keys | Key starts with `re_` |
| Vercel project imported from `DavidVille87/cryogene` | Sam's Vercel dashboard | Project exists, **Deploy not yet clicked** |

If any row above is unchecked, **do not proceed to env-var setup** — the deploy will fail in a way that's annoying to debug.

---

## Variable manifest

Each row tells you what the code does with the value, where to fetch it, and what environments it must be set in. **Production + Preview + Development** is the safe default for everything except `ADMIN_DEV_BYPASS` (which must NEVER be set in production).

### 1. Site identity

| Key | Value | Vercel envs | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://cryogenelaboratories.co.uk` | Prod, Preview, Dev | Used in `lib/seo.ts` for canonical URLs, OpenGraph, sitemap, JSON-LD. **Do not include trailing slash.** Preview env can use the Vercel-issued `*.vercel.app` URL if you want preview links to look right, but it's optional — code falls back gracefully. |
| `NEXT_PUBLIC_SITE_NAME` | `Cryogene Laboratories` | Prod, Preview, Dev | Hard fallback for `getStoreName()` if Firestore config doc is missing. After first admin save, the live config doc takes over — but this is the bootstrap value before any admin login. |

### 2. Firebase Client SDK (browser-exposed — public)

These come from **Firebase console → Project settings → General → Your apps → Web app config**. If no web app exists yet, click "Add app" → web (`</>`) → register app named `cryogene-web` (no Firebase Hosting). The config object Firebase displays maps directly to these keys.

| Key | Value | Vercel envs | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `apiKey` field | Prod, Preview, Dev | Public by design — restricted via Firebase security rules + domain allowlist. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` field (`cryogene-5ee94.firebaseapp.com`) | Prod, Preview, Dev | |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` field | Prod, Preview, Dev | Same value as the server-side `FIREBASE_PROJECT_ID` below. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `storageBucket` field (likely `cryogene-5ee94.firebasestorage.app` for newer projects, or `cryogene-5ee94.appspot.com` for legacy — copy the exact string Firebase displays) | Prod, Preview, Dev | Used by both client SDK and admin SDK (admin reads it from this same key — see `lib/firebase/admin.ts:41`). |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` field | Prod, Preview, Dev | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `appId` field | Prod, Preview, Dev | |

### 3. Firebase Admin SDK (server-only — sensitive)

These come from the **service-account JSON** Sam (or you, if Sam shared admin) downloaded in pre-flight. The JSON has fields `project_id`, `client_email`, and `private_key`.

| Key | Value | Vercel envs | Notes |
|---|---|---|---|
| `FIREBASE_PROJECT_ID` | `project_id` field from the JSON (`cryogene-5ee94`, same as the public one above) | Prod, Preview, Dev | The code's `isFirebaseConfigured()` guard checks this is set AND not the literal string `REPLACE_ME` — anything else makes the app try to connect to Firestore. |
| `FIREBASE_CLIENT_EMAIL` | `client_email` field (`firebase-adminsdk-fbsvc@cryogene-5ee94.iam.gserviceaccount.com`) | Prod, Preview, Dev | |
| `FIREBASE_PRIVATE_KEY` | **Base64-encoded** `private_key` field — see encoding step below | Prod, Preview, Dev | The code base64-decodes this at runtime (`lib/firebase/admin.ts:31-33`). Do NOT paste the raw `-----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----\n` blob — the multi-line value triggers Vercel paste bugs and the code expects base64. |

**Encoding `FIREBASE_PRIVATE_KEY`:**

```bash
# Replace path with wherever you saved the service account JSON
cat ~/Downloads/cryogene-firebase-adminsdk-*.json \
  | jq -r '.private_key' \
  | base64 -w 0
```

(On macOS, replace `base64 -w 0` with `base64 | tr -d '\n'`.)

The output is one long unbroken string starting with `LS0tLS1CRUdJTi...`. Copy that whole string and paste as the `FIREBASE_PRIVATE_KEY` value in Vercel.

### 4. Email (Resend)

| Key | Value | Vercel envs | Notes |
|---|---|---|---|
| `RESEND_API_KEY` | API key from Resend dashboard (starts with `re_`) | Prod, Preview, Dev | |
| `RESEND_FROM_EMAIL` | `orders@cryogenelaboratories.co.uk` | Prod, Preview, Dev | Must be on the verified Resend domain. If you want a friendly name, use the format: `Cryogene Laboratories <orders@cryogenelaboratories.co.uk>`. |
| `RESEND_NOTIFICATION_EMAIL` | Sam's address where new-order alerts arrive (e.g. `sam@cryogenelaboratories.co.uk` or `samcowling118@googlemail.com`) | Prod, Preview, Dev | Internal recipient — does not need to be on a verified domain. |

### 5. Payments (Phase 1 = stub)

| Key | Value | Vercel envs | Notes |
|---|---|---|---|
| `PAYMENT_PROVIDER` | `stub` | Prod, Preview, Dev | When set to `stub`, checkout creates a real order in Firestore with `status: paid` and a `?stub=true` banner on the confirmation page. **Sam will be able to test the full order flow before TrueLayer goes live.** Switch to `truelayer` only when Phase 2 ships. |

### 6. Admin bypass (DEV ONLY — never set in production)

| Key | Value | Vercel envs | Notes |
|---|---|---|---|
| `ADMIN_DEV_BYPASS` | **Do not add this variable** | None | The code already double-guards this against production (`lib/admin-auth.ts:9-12` requires both `NODE_ENV !== "production"` AND `ADMIN_DEV_BYPASS === "1"`). On Vercel, `NODE_ENV` is always `production`, so even if this leaked in, the bypass is structurally impossible. But for hygiene: **do not add this row at all.** Leaving the key absent is correct behaviour. |

---

## Vercel UI walkthrough (dashboard path)

After importing the repo but **before clicking Deploy**:

1. Vercel project dashboard → Settings → Environment Variables
2. For each row above (sections 1–5 only — section 6 is "do nothing"):
   - **Name:** the `KEY` from the table
   - **Value:** the value from the table (or the resolved value from your Firebase / Resend dashboards)
   - **Environments:** tick Production, Preview, Development (all three) for everything in sections 1–5
3. After all variables are added, click "Save"
4. Go back to the project Deployments tab and trigger the first deploy: either push a no-op commit, or use "Redeploy" on the failed initial import deploy

The first deploy takes ~2 minutes. If it fails, the Build Logs will show which env var is missing or malformed — `FIREBASE_PRIVATE_KEY` is the most likely culprit if you skipped the base64 encoding.

---

## Vercel CLI walkthrough (when CLI is installed and authenticated as Sam)

If you installed `vercel` CLI and ran `vercel login` as Sam, you can paste env vars from the terminal — much faster than the dashboard, and avoids the multi-line paste bug for `FIREBASE_PRIVATE_KEY`. Memory rule applies: **always use `printf` not `echo`** when piping values.

```bash
# After `vercel link` to associate this directory with the project:

printf "https://cryogenelaboratories.co.uk" | vercel env add NEXT_PUBLIC_SITE_URL production
printf "https://cryogenelaboratories.co.uk" | vercel env add NEXT_PUBLIC_SITE_URL preview
printf "https://cryogenelaboratories.co.uk" | vercel env add NEXT_PUBLIC_SITE_URL development

printf "Cryogene Laboratories" | vercel env add NEXT_PUBLIC_SITE_NAME production
# … repeat for preview and development …

# For the Firebase web SDK values, paste each one when prompted:
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
# (CLI prompts for value — paste the apiKey string from Firebase console)

# For the base64-encoded private key:
cat ~/Downloads/cryogene-firebase-adminsdk-*.json \
  | jq -r '.private_key' \
  | base64 -w 0 \
  | vercel env add FIREBASE_PRIVATE_KEY production

# Confirm everything landed:
vercel env ls
```

When all variables are set, deploy:

```bash
vercel --prod
```

---

## Post-deploy verification (do these in order)

1. **Build succeeded:** Vercel deployment status = Ready
2. **Site loads at the Vercel-issued URL** (`cryogene-xxxxx.vercel.app`) before custom domain is wired
3. **Age gate appears on first visit** — confirms server-rendered cookie check is working
4. **Product listing renders 57 SKUs with FLUX-rendered bottle images** — confirms `lib/products.ts` is reading from Firestore (or falling back to seed JSON if seed has not yet been pushed; see step 6)
5. **Open Network tab, view a product page, check the `Product` JSON-LD block:** `brand.name` and `seller.name` should both be `"Cryogene Laboratories"` — confirms `lib/seo.ts` is consuming the live config / fallback correctly
6. **Run the seed script** to push the 57 products + initial config doc to Firestore (one-time):
   ```bash
   # From your local machine, with the same env vars in .env.local:
   npx tsx scripts/seed-firestore.ts
   ```
7. **Set yourself as admin** so you can log into `/admin`:
   ```bash
   # First create a Firebase Auth user via the live signup form at /signup, then:
   npx tsx scripts/set-admin-claim.ts <your-firebase-auth-uid>
   ```
   The UID appears in Firebase Authentication console after signup.
8. **Test admin login:** visit `/admin` while logged in — should show the dashboard, not the auth wall
9. **Place a stub-payment test order** (`PAYMENT_PROVIDER=stub`) and confirm:
   - Order appears in `/admin/orders`
   - Resend sends the confirmation email to the customer address
   - Resend sends the notification email to `RESEND_NOTIFICATION_EMAIL`
10. **Verify `firestore.rules` and `storage.rules` are deployed:**
    ```bash
    firebase deploy --only firestore:rules,storage:rules --project cryogene-5ee94
    ```
    (Requires the Firebase CLI logged in as a project owner.)

---

## Custom domain (after deploy is green)

| Step | Where | Action |
|---|---|---|
| 1 | Vercel project → Settings → Domains | Add `cryogenelaboratories.co.uk` and `www.cryogenelaboratories.co.uk` |
| 2 | Vercel will issue DNS targets (apex `A` record + `www` `CNAME`) | Note the values shown |
| 3 | Namecheap → Domain List → cryogenelaboratories.co.uk → Manage → Advanced DNS | Add the records Vercel showed. Delete any pre-existing parking records that conflict. |
| 4 | Wait 5–60 minutes for DNS propagation | Vercel auto-detects and issues a TLS cert via Let's Encrypt once DNS resolves |
| 5 | Update `NEXT_PUBLIC_SITE_URL` in Vercel env vars to `https://cryogenelaboratories.co.uk` if it was set to a Vercel-issued URL initially, then redeploy | Vercel → Env Vars → Edit |

---

## Phase 2 / Phase 3 — DO NOT SET YET

Listed for reference. These keys belong to the env var manifest but **must remain unset during Phase 1**. The code defaults to `stub` payment provider when `PAYMENT_PROVIDER` is undefined or `stub`, and Phase 3 fulfilment code does not yet exist.

Phase 2 (TrueLayer Pay by Bank):
- `PAYMENT_PROVIDER=truelayer` — flip when ready
- `TRUELAYER_CLIENT_ID`
- `TRUELAYER_CLIENT_SECRET` — server-only
- `TRUELAYER_MERCHANT_ACCOUNT_ID`
- `TRUELAYER_SIGNING_KEY_ID`
- `TRUELAYER_PRIVATE_KEY` — server-only
- `TRUELAYER_WEBHOOK_SECRET` — server-only
- `TRUELAYER_ENVIRONMENT=sandbox` (start) → `live` (after testing)
- `NEXT_PUBLIC_TRUELAYER_RETURN_URL`

Phase 3 (fulfilment) — ACTIVE 2026-05-07, see Phase 3 section below for full details:
- `COURIER_PLATFORM` (`stub` | `royalmail` | `sendcloud` | `shippo`)
- `ROYALMAIL_CLICK_AND_DROP_API_KEY` — server-only
- `ROYALMAIL_CLICK_AND_DROP_BASE_URL` (defaults to production endpoint)
- `ROYALMAIL_TRACKING_WEBHOOK_SECRET` — server-only HMAC secret
- `PRINTER_PLATFORM` (`stub` | `zebra-cloud` | `printnode`)
- `ZEBRA_CLOUD_API_KEY` — server-only
- `ZEBRA_CLOUD_BASE_URL` (defaults to production endpoint)
- `DISPATCH_BATCH_SECRET` — shared secret between Cloud Function and the
  `/api/admin/dispatch/run-batch` endpoint, generate 32+ random chars

---

## Phase 3 (fulfilment) — full env var detail

The full Phase 3 codebase ships with stub adapters by default. Until every
required variable is set AND `config.dispatch.enabled` is toggled true via
`/admin/settings`, the system runs against stubs (fake labels, no Royal Mail
calls, no Zebra prints). This is intentional — stubs let dev and staging
exercise the dispatch flow end-to-end without burning postage.

### Vercel (Next.js app)

| Variable | Where | Value at launch |
|---|---|---|
| `COURIER_PLATFORM` | Production | `royalmail` once Sam's OBA + API key are ready, else `stub` |
| `ROYALMAIL_CLICK_AND_DROP_API_KEY` | Production (server) | From Sam's RM Business Account portal |
| `ROYALMAIL_CLICK_AND_DROP_BASE_URL` | Optional | Override for sandbox during onboarding: `https://api.parcel.royalmail.com/sandbox` |
| `ROYALMAIL_TRACKING_WEBHOOK_SECRET` | Production (server) | Admin-generated 32+ char random string. Same value used when registering the webhook with RM. |
| `PRINTER_PLATFORM` | Production | `zebra-cloud` once Sam's Zebra is registered, else `stub` |
| `ZEBRA_CLOUD_API_KEY` | Production (server) | From Zebra developer portal |
| `ZEBRA_CLOUD_BASE_URL` | Optional | Override only if Zebra's docs change endpoint |
| `DISPATCH_BATCH_SECRET` | Production (server) | Admin-generated 32+ char random string. Must match the Cloud Function secret. |

### Cloud Functions (separate env)

```bash
# Set the shared batch secret (Cloud Function reads it via defineSecret)
firebase functions:secrets:set DISPATCH_BATCH_SECRET

# Set the public APP_BASE_URL param (read via defineString)
firebase functions:config:set app.base_url="https://cryogenelaboratories.co.uk"
# or, with v2 params API:
# functions:params API — see Firebase docs
```

The Cloud Function runs Mon-Fri 13:00 Europe/London. Verify deploy with:
```bash
firebase functions:list | grep runDailyDispatchBatch
```

### Switching from stub to live

1. Sam delivers all items in `docs/client-queries-sam.md` "Before Phase 3 goes live"
2. David sets the env vars above in Vercel and redeploys
3. David populates `/admin/settings` → Dispatch tab and saves (this seeds `config/dispatch` with Sam's values)
4. David flips `enabled = true` toggle and saves (Zod schema enforces all required fields populated before this is accepted)
5. David runs the smoke-test runbook in `docs/handover/dispatch-smoke-test.md` against the live RM sandbox
6. David promotes from sandbox to production by switching `ROYALMAIL_CLICK_AND_DROP_BASE_URL` to the production endpoint
7. Run a single test order to an internal address before opening to customers

---

## Source of truth for this manifest

This document was generated from a verified grep of `process.env.*` references across `lib/`, `app/`, `components/`, and `scripts/`. If you add a new env var anywhere in the code, add a row to this manifest in the same commit. Stale manifests cause silent production misconfigurations.
