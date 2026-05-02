# Firestore Read Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `DATA_MODE=seed` workaround by implementing Firestore read paths in `lib/products.ts`, fixing a latent path bug in `lib/orders.ts`, seeding Firestore with the 57-product catalogue, and proving Firestore-mode parity with seed-mode before removing the override.

**Architecture:** Single-file read implementation that mirrors the existing seed-mode contracts in `lib/products.ts`, plus one path fix in `lib/orders.ts` and a corresponding rule update. The other 5 domain modules (`orders.ts`, `customers.ts`, `config.ts`, `enquiries.ts`, `app/actions/products.ts`) already have functional Firestore branches — no changes needed beyond the orderCounters path. Migration is gated by a Vercel env var swap, not a code-level switch, so rollback is one PATCH call.

**Tech Stack:** Next.js 16 App Router · firebase-admin v13 · Firestore (europe-west2) · Vercel REST API · `tsx` for the seed script · TypeScript strict mode for type-checking gate (no test suite per project spec).

**Test approach (per project spec — no automated tests):** Each gate is `npm run build` green + `npx tsc --noEmit` clean + manual smoke test of specified routes. Production verification is via REST API health checks against deployed URLs.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `lib/products.ts` | Modify | Replace 2 `throw "Firestore product reads not yet implemented"` stubs with admin SDK reads. Apply same filter/sort logic as seed branch. |
| `lib/orders.ts` | Modify | Fix invalid 3-segment Firestore path `config/orderCounters/${today}` → 2-segment `orderCounters/${today}`. |
| `firestore.rules` | Modify | Match the new 2-segment path so the rule still applies (admin SDK still bypasses, but the rule documents intent). |
| `scripts/seed-firestore.ts` | Modify | Add seeding of `config/main` document so Firestore-mode `getConfig()` returns a real doc, not `DEFAULT_CONFIG`. |
| `lib/data-mode.ts` | Modify (Task 8) | Remove the `DATA_MODE=seed` override branch once production proves Firestore works. |
| `docs/handover/stage1b-env-vars.md` | Modify (Task 8) | Remove §4b documenting the override since the migration debt is paid. |

No new files. No new dependencies.

---

## Task 1: Implement Firestore reads in `lib/products.ts`

**Files:**
- Modify: `C:\Users\david\repos\cryogene\lib\products.ts:39-67`

**Why this task:** Two functions throw in Firestore mode. Both are called by every storefront route via `getProducts()` (listing pages, sitemap, llms.txt, featured products) and `getProductBySlug()` (product detail pages). Until these return data, no route renders in Firestore mode.

- [ ] **Step 1: Replace `getProducts` Firestore stub**

Open `lib/products.ts`. Find lines 39-59 (the existing `getProducts` function). Replace the entire function body with:

```typescript
export async function getProducts(options?: {
  category?: ProductCategory;
  activeOnly?: boolean;
  limit?: number;
}): Promise<Product[]> {
  if (isSeedMode()) {
    let results = await mergedSeed();
    if (options?.activeOnly) {
      results = results.filter((p) => p.active);
    }
    if (options?.category) {
      results = results.filter((p) => p.category === options.category);
    }
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }
    return results;
  }
  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured (admin SDK unavailable)");
  let query: FirebaseFirestore.Query = db.collection("products");
  if (options?.activeOnly) {
    query = query.where("active", "==", true);
  }
  if (options?.category) {
    query = query.where("category", "==", options.category);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  const snap = await query.get();
  return snap.docs.map((d) => d.data() as Product);
}
```

- [ ] **Step 2: Replace `getProductBySlug` Firestore stub**

In the same file, find lines 61-67 (`getProductBySlug`). Replace with:

```typescript
export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (isSeedMode()) {
    const all = await mergedSeed();
    return all.find((p) => p.slug === slug) ?? null;
  }
  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured (admin SDK unavailable)");
  const snap = await db
    .collection("products")
    .where("slug", "==", slug)
    .limit(1)
    .get();
  return snap.empty ? null : (snap.docs[0]!.data() as Product);
}
```

- [ ] **Step 3: Add `getAdminDb` import**

The file already imports `seedProducts`, `Product`, and `isSeedMode`. Add `getAdminDb` to the imports at the top:

```typescript
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import seedProducts from "@/data/products.seed.json";
import type { Product, ProductCategory } from "@/types";
import { isSeedMode } from "@/lib/data-mode";
import { getAdminDb } from "@/lib/firebase/admin";
```

- [ ] **Step 4: Type-check**

Run from project root:

```powershell
cd C:\Users\david\repos\cryogene; npx tsc --noEmit 2>&1 | Select-Object -Last 30
```

Expected: no errors. If errors mention `FirebaseFirestore.Query`, the namespace import may need a fully-qualified type — change the type annotation to `import("firebase-admin/firestore").Query`.

- [ ] **Step 5: Commit**

```powershell
cd C:\Users\david\repos\cryogene; git add lib/products.ts; git commit -m "feat: implement Firestore read paths in lib/products.ts

Replace 'not yet implemented' stubs with admin SDK reads that mirror the
seed-mode filter/sort behaviour (activeOnly, category, limit). When
isSeedMode() is false, getProducts and getProductBySlug query the
products collection via the admin SDK.

Storefront listing, detail, sitemap, and llms.txt all depend on these
two functions — until they return data, Firestore-mode deploys crash
on page-data collection.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Fix invalid 3-segment Firestore path in `lib/orders.ts`

**Files:**
- Modify: `C:\Users\david\repos\cryogene\lib\orders.ts:38`

**Why this task:** `db.doc("config/orderCounters/${today}")` is a 3-segment path. Firestore document paths must be even-segmented (collection/doc/collection/doc/...). This code has never executed because we've always been in seed mode. The first order placed in Firestore mode would throw at the runtime `db.doc(...)` call. Switching to the 2-segment flat collection `orderCounters/${today}` makes it valid.

- [ ] **Step 1: Fix the path**

Open `lib/orders.ts`. Find line 38:

```typescript
  const counterRef = db.doc(`config/orderCounters/${today}`);
```

Replace with:

```typescript
  const counterRef = db.doc(`orderCounters/${today}`);
```

- [ ] **Step 2: Type-check**

```powershell
cd C:\Users\david\repos\cryogene; npx tsc --noEmit 2>&1 | Select-Object -Last 5
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```powershell
cd C:\Users\david\repos\cryogene; git add lib/orders.ts; git commit -m "fix: order counter path is even-segmented

config/orderCounters/\${today} is 3 segments — Firestore document
paths must be even-segmented (collection/doc/...). The code never
executed in production because we have always been in seed mode,
but flipping DATA_MODE off would make the first order throw
'Invalid document reference. Document references must have an
even number of segments.'

Switch to the flat orderCounters/\${today} collection. Counter
semantics unchanged — single transactional read+write per order.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Update `firestore.rules` for new orderCounters path

**Files:**
- Modify: `C:\Users\david\repos\cryogene\firestore.rules:36-39`

**Why this task:** The rules file matches the now-defunct `config/orderCounters/{day}` path. Update to match the new flat collection, so the rule keeps documenting intent (admin SDK bypasses regardless, but rules are configuration-as-code).

- [ ] **Step 1: Update the rule**

Open `firestore.rules`. Find lines 36-39:

```
    match /config/orderCounters/{day} {
      allow read: if false;
      allow write: if false;
    }
```

Replace with:

```
    match /orderCounters/{day} {
      allow read: if false;
      allow write: if false;
    }
```

- [ ] **Step 2: Commit**

```powershell
cd C:\Users\david\repos\cryogene; git add firestore.rules; git commit -m "fix: update orderCounters rule path to match new flat collection

Rules don't gate admin-SDK access (Cloud Functions and server-only
code bypass them), but they document the intent of each path. Keep
this rule aligned with the lib/orders.ts change so future client-SDK
attempts are still locked out.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 3: Note that deploying rules is a separate manual step**

`firebase-tools` CLI is not in the project. Rules are deployed via:

```powershell
cd C:\Users\david\repos\cryogene; npx firebase-tools deploy --only firestore:rules
```

Do **NOT** run this yet — rules deploy is gated by the seed step (Task 4). Capture this command for Task 7.

---

## Task 4: Seed Firestore with the 57-product catalogue + config doc

**Files:**
- Modify: `C:\Users\david\repos\cryogene\scripts\seed-firestore.ts` (extend to seed config/main too)

**Why this task:** Firestore is currently empty. Until the products collection has 57 docs, `getProducts()` in Firestore mode returns an empty list and the storefront renders blank. The seed script also needs to write `config/main` so `getConfig()` returns a real document instead of falling back to `DEFAULT_CONFIG`.

- [ ] **Step 1: Add config seeding to the script**

Open `scripts/seed-firestore.ts`. After the products loop (around line 51, just before the closing `console.log` of "Done."), insert:

```typescript
  // Seed config/main with default Cryogene Laboratories config
  const defaultConfig = {
    storeName: "Cryogene Laboratories",
    storeEmail: "hello@cryogene.co.uk",
    storePhone: null,
    registeredAddress: "[ADDRESS TBC]",
    companyNumber: null,
    vatNumber: null,
    shipping: {
      flatRateInPence: 495,
      freeThresholdInPence: 7500,
      estimatedDispatch: "Dispatched within 1 working day",
    },
    vat: {
      registered: false,
      rate: 0.2,
      displayPricesInclusive: false,
    },
    notifications: {
      newOrderEmailTo: "orders@cryogene.co.uk",
    },
    updatedAt: new Date(),
    updatedBy: "seed-script",
  };
  await db.doc("config/main").set(defaultConfig);
  console.log(`  ✓ config/main seeded`);
```

- [ ] **Step 2: Run the seed script**

The seed script reads `.env.local`, which already has Firebase admin credentials. Run:

```powershell
cd C:\Users\david\repos\cryogene; npx tsx scripts/seed-firestore.ts 2>&1 | Select-Object -Last 20
```

Expected output:

```
Seeding 57 products to Firestore...
  ✓ IGF-1LR3
  ✓ 5-Amino-1MQ
  ... (55 more lines)
  ✓ config/main seeded

Done. 57 products written to Firestore.
```

If the script fails with "Firebase credentials missing", check `.env.local` exists at the project root and has `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` set.

- [ ] **Step 3: Verify products landed in Firestore**

```powershell
$auth = Get-Content C:\Users\david\AppData\Roaming\com.vercel.cli\Data\auth.json | ConvertFrom-Json; $proj = Get-Content C:\Users\david\repos\cryogene\.vercel\project.json | ConvertFrom-Json; powershell -Command "cd C:\Users\david\repos\cryogene; npx tsx -e ""import { config } from 'dotenv'; config({ path: '.env.local' }); import('firebase-admin/app').then(({initializeApp,cert,getApps}) => { import('firebase-admin/firestore').then(({getFirestore}) => { if (getApps().length === 0) { const pk = Buffer.from(process.env.FIREBASE_PRIVATE_KEY, 'base64').toString('utf-8'); initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: pk }) }); } getFirestore().collection('products').count().get().then(s => console.log('Product count:', s.data().count)); }); });"""
```

Expected: `Product count: 57`. If the count is wrong, check the seed script output for errors.

(Simpler alternative: open Firebase Console → cryogene-5ee94 → Firestore → products collection. Should see 57 docs.)

- [ ] **Step 4: Commit the seed script change**

```powershell
cd C:\Users\david\repos\cryogene; git add scripts/seed-firestore.ts; git commit -m "feat: seed config/main alongside products

The seed script previously only wrote products. Once DATA_MODE=seed is
removed, getConfig() reads from Firestore — without a seeded config
doc, every storefront page that consumes config (footer, navbar, SEO,
checkout) falls back to DEFAULT_CONFIG silently.

Seeding config/main with the same defaults makes the bootstrap
explicit and gives Sam a real document to edit via /admin/settings.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Local build proves Firestore-mode parity

**Files:**
- Modify temporarily: `C:\Users\david\repos\cryogene\.env.local`

**Why this task:** Before flipping DATA_MODE off in Vercel, prove locally that the build succeeds, all routes render, and the data shape matches seed mode. Catching a regression locally is 10× cheaper than a failed prod deploy.

- [ ] **Step 1: Comment out `DATA_MODE` in `.env.local`**

Open `.env.local`. Find the line:

```
DATA_MODE="seed"
```

Comment it out:

```
# DATA_MODE="seed"   # disabled to test Firestore reads locally — restore before commit
```

- [ ] **Step 2: Build with Firestore mode**

```powershell
cd C:\Users\david\repos\cryogene; npm run build 2>&1 | Select-Object -Last 30
```

Expected: build green, 94 routes generated. If the build fails with "Firestore product reads not yet implemented", Task 1 didn't land — re-check `lib/products.ts`.

If the build fails with "Firestore not configured", admin credentials are missing — confirm `.env.local` has `FIREBASE_*` vars set.

If the build fails with "5 NOT_FOUND" or "no document at config/main", Task 4 step 3 didn't seed — re-run the seed script.

- [ ] **Step 3: Run the dev server and smoke-test 5 critical routes**

```powershell
cd C:\Users\david\repos\cryogene; npm run dev
```

Wait until you see `Ready in Xs` (typically 2-3 seconds). In another terminal or browser:

| Path | Expected |
|---|---|
| `http://localhost:3000/` | Homepage renders, hero copy visible, no client console errors |
| `http://localhost:3000/peptides` | Listing page shows 48 peptide products (filter works) |
| `http://localhost:3000/peptides/ipamorelin` | Product detail page renders, JSON-LD blocks present, FAQ visible |
| `http://localhost:3000/admin` | Redirects to sign-in (expected when not logged in) |
| `http://localhost:3000/sitemap.xml` | XML response with all product URLs |

Stop the dev server (`Ctrl+C`) when done.

- [ ] **Step 4: Restore `DATA_MODE=seed` in `.env.local`**

Open `.env.local`. Restore the line so local dev defaults to seed mode (faster, no network):

```
DATA_MODE="seed"
```

(`.env.local` is gitignored — no commit needed.)

- [ ] **Step 5: No commit needed (only test artefacts changed locally)**

Confirm working tree is clean:

```powershell
cd C:\Users\david\repos\cryogene; git status --short
```

Expected: empty output.

---

## Task 6: Push commits and trigger Vercel auto-deploy

**Files:** none modified — pure git operation.

**Why this task:** Tasks 1-4 produced 4 commits on local `main`. Pushing them triggers an auto-deploy on the Vercel project linked to `cryogeneadmin/Cryogene`. The deployed build still has `DATA_MODE=seed` set in Vercel env vars, so it deploys identically to current production — this push is a smoke test that the four code changes don't break the existing seed-mode build.

- [ ] **Step 1: Push to origin**

```powershell
cd C:\Users\david\repos\cryogene; git push origin main 2>&1 | Select-Object -Last 5
```

Expected:

```
   e3518fd..<new_sha>  main -> main
```

- [ ] **Step 2: Watch the auto-deploy**

```powershell
$auth = Get-Content C:\Users\david\AppData\Roaming\com.vercel.cli\Data\auth.json | ConvertFrom-Json; $token = $auth.token; $proj = Get-Content C:\Users\david\repos\cryogene\.vercel\project.json | ConvertFrom-Json; $headers = @{ "Authorization" = "Bearer $token" }; for ($i = 0; $i -lt 60; $i++) { $deps = Invoke-RestMethod -Uri "https://api.vercel.com/v6/deployments?projectId=$($proj.projectId)&teamId=$($proj.orgId)&limit=1" -Headers $headers; $d = $deps.deployments[0]; Write-Host "[$i] STATE: $($d.state)  URL: $($d.url)"; if ($d.state -in @("READY","ERROR","CANCELED")) { break }; Start-Sleep 10 }
```

Expected: `STATE: READY` within 1-2 minutes.

- [ ] **Step 3: Smoke-test the new deploy in seed mode**

```powershell
$base = "https://cryogene-mhmspwomj-cryogeneadmin-5512s-projects.vercel.app"; @("/","/peptides","/peptides/ipamorelin","/sitemap.xml") | ForEach-Object { try { $r = Invoke-WebRequest "$base$_" -MaximumRedirection 0 -UseBasicParsing; Write-Host "$($r.StatusCode) $_" } catch { Write-Host "$($_.Exception.Response.StatusCode.value__) $_" } }
```

(Replace `$base` with the latest deploy URL from Step 2 if it differs.)

Expected: all 200 OK.

If any return non-200, **STOP** and investigate before Task 7. Do not flip DATA_MODE off until seed-mode parity is confirmed.

---

## Task 7: Flip Vercel env vars to Firestore mode + deploy rules

**Files:** none modified — pure infrastructure operation.

**Why this task:** This is the actual cutover. Removing `DATA_MODE=seed` from Vercel env vars makes `isSeedMode()` return false in production, which routes every read through Firestore. We also deploy the updated `firestore.rules`.

- [ ] **Step 1: Deploy the updated Firestore rules**

```powershell
cd C:\Users\david\repos\cryogene; npx firebase-tools deploy --only firestore:rules 2>&1 | Select-Object -Last 15
```

Expected:

```
✔  Deploy complete!
```

If `firebase-tools` is not installed: `npm install -g firebase-tools` first, then `npx firebase-tools login` if not already logged in. The `.firebaserc` already targets `cryogene-5ee94`.

- [ ] **Step 2: Remove `DATA_MODE` from Vercel env vars (production + development)**

```powershell
cd C:\Users\david\repos\cryogene; vercel env rm DATA_MODE production --yes 2>&1 | Select-String "Removed|Error"; vercel env rm DATA_MODE development --yes 2>&1 | Select-String "Removed|Error"
```

Expected: 2× `Removed Environment Variable`.

- [ ] **Step 3: Trigger a fresh production deploy**

The previous push (Task 6) deployed with DATA_MODE still set. We need a new deploy to pick up the env-var removal. Since auto-deploys only fire on git push, trigger via CLI:

```powershell
cd C:\Users\david\repos\cryogene; vercel --prod --yes 2>&1 | Select-Object -Last 30
```

Expected: `STATE: READY` after ~1 min build. Output shows the new deploy URL.

- [ ] **Step 4: Smoke-test the Firestore-backed deploy**

Capture the new URL from Step 3 output, then:

```powershell
$base = "<paste new deploy URL here>"; @("/","/peptides","/peptides/ipamorelin","/sitemap.xml","/llms.txt","/admin","/about","/legal/terms") | ForEach-Object { try { $r = Invoke-WebRequest "$base$_" -MaximumRedirection 0 -UseBasicParsing; Write-Host "$($r.StatusCode) $_ ($($r.RawContentLength)b)" } catch { Write-Host "$($_.Exception.Response.StatusCode.value__) $_" } }
```

Expected: same status codes and sizes (~within 5%) as the previous seed-mode deploy. If the Firestore deploy renders an empty product list (`/peptides` returns much smaller body, no product cards), the seed step (Task 4) didn't land — products collection is empty.

**Rollback if needed:** add `DATA_MODE=seed` back via REST API:

```powershell
$auth = Get-Content C:\Users\david\AppData\Roaming\com.vercel.cli\Data\auth.json | ConvertFrom-Json; $token = $auth.token; $proj = Get-Content C:\Users\david\repos\cryogene\.vercel\project.json | ConvertFrom-Json; $body = '{"key":"DATA_MODE","value":"seed","type":"encrypted","target":["production","development"]}'; Invoke-RestMethod -Uri "https://api.vercel.com/v10/projects/$($proj.projectId)/env?teamId=$($proj.orgId)&upsert=true" -Method POST -Headers @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" } -Body $body
```

Then redeploy and you're back to the working seed-mode state.

---

## Task 8: Remove the `DATA_MODE` override from code

**Files:**
- Modify: `C:\Users\david\repos\cryogene\lib\data-mode.ts`
- Modify: `C:\Users\david\repos\cryogene\docs\handover\stage1b-env-vars.md` (delete §4b)

**Why this task:** With Firestore proven in production (Task 7), the override is dead code. Removing it locks the migration in — future `DATA_MODE=seed` settings would be silently ignored. Also clears the documented "migration debt" so the manifest reflects reality.

- [ ] **Step 1: Remove the override branch from `lib/data-mode.ts`**

Open `lib/data-mode.ts`. Replace the entire file with:

```typescript
// lib/data-mode.ts
import "server-only";
import { isFirebaseAdminReady } from "@/lib/firebase/admin";

export function isSeedMode(): boolean {
  return !isFirebaseAdminReady();
}
```

- [ ] **Step 2: Remove §4b from the handover doc**

Open `docs/handover/stage1b-env-vars.md`. Find the section heading `### 4b. Data layer (TEMPORARY — until Firestore read migration lands)` and the migration-debt paragraph beneath it (extends until the line `### 5. Payments (Phase 1 = stub)`).

Delete the entire §4b section (heading + table + migration-debt paragraph). Section §5 becomes the next heading after §4 immediately.

- [ ] **Step 3: Type-check + build**

```powershell
cd C:\Users\david\repos\cryogene; npx tsc --noEmit 2>&1 | Select-Object -Last 5; npm run build 2>&1 | Select-Object -Last 5
```

Expected: clean type-check, build green.

- [ ] **Step 4: Commit**

```powershell
cd C:\Users\david\repos\cryogene; git add lib/data-mode.ts docs/handover/stage1b-env-vars.md; git commit -m "refactor: remove DATA_MODE=seed override now Firestore reads work

The override was added on 2026-05-01 as a workaround for the Firestore
read stubs in lib/products.ts that were throwing at build time. With
the migration shipped (Task 1) and proven in production (Task 7),
the override is dead code — the seed JSON is now only used by the
seed-firestore script for one-shot bootstrapping.

isSeedMode() returns to its original semantics: seed mode iff
Firebase admin credentials are unavailable. Setting DATA_MODE=seed
in env vars would now have no effect.

Stage 1b handover doc §4b removed since the migration debt is paid.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: Push and watch auto-deploy**

```powershell
cd C:\Users\david\repos\cryogene; git push origin main 2>&1 | Select-Object -Last 3
```

The push triggers an auto-deploy. Wait for `STATE: READY`:

```powershell
$auth = Get-Content C:\Users\david\AppData\Roaming\com.vercel.cli\Data\auth.json | ConvertFrom-Json; $token = $auth.token; $proj = Get-Content C:\Users\david\repos\cryogene\.vercel\project.json | ConvertFrom-Json; for ($i = 0; $i -lt 60; $i++) { $deps = Invoke-RestMethod -Uri "https://api.vercel.com/v6/deployments?projectId=$($proj.projectId)&teamId=$($proj.orgId)&limit=1" -Headers @{ "Authorization" = "Bearer $token" }; $d = $deps.deployments[0]; Write-Host "[$i] STATE: $($d.state)"; if ($d.state -in @("READY","ERROR","CANCELED")) { break }; Start-Sleep 10 }
```

- [ ] **Step 6: Final smoke-test of the cleaned deploy**

```powershell
$base = "<paste latest deploy URL>"; @("/","/peptides","/peptides/ipamorelin") | ForEach-Object { try { $r = Invoke-WebRequest "$base$_" -MaximumRedirection 0 -UseBasicParsing; Write-Host "$($r.StatusCode) $_ ($($r.RawContentLength)b)" } catch { Write-Host "FAIL $_" } }
```

Expected: 200 OK on all three.

---

## Task 9: Admin round-trip verification

**Why this task:** The whole point of moving to Firestore is so Sam can edit products via `/admin/products` without redeploying. This task proves the round-trip end-to-end: admin edit → Firestore write → storefront read on next page load.

This task is a **manual UI test** — there is no automated test infrastructure per project spec.

- [ ] **Step 1: Grant yourself admin access**

If you don't already have an admin Firebase user:

```powershell
cd C:\Users\david\repos\cryogene; npx tsx scripts/set-admin-claim.ts <your-firebase-auth-uid>
```

Get the UID by signing up at `<deploy-url>/sign-up` first, then visiting Firebase Console → Authentication → users.

- [ ] **Step 2: Sign in to /admin**

Browser: visit `<deploy-url>/sign-in`, sign in with the admin email + password.

Then navigate to `<deploy-url>/admin/products`.

Expected: list of 57 products visible.

- [ ] **Step 3: Edit one product's `shortDescription`**

Click any product (e.g. Ipamorelin) → in the edit form, change `shortDescription` to add the literal string `[FIRESTORE-EDIT-TEST]` at the end. Save.

Expected: redirect to `/admin/products`, no error.

- [ ] **Step 4: Verify the edit lands on the public storefront**

Open a private/incognito window (no admin session). Navigate to `<deploy-url>/peptides/ipamorelin`.

Expected: the `[FIRESTORE-EDIT-TEST]` string is visible in the page (was not in seed JSON, only in Firestore now → proof the storefront reads from Firestore).

- [ ] **Step 5: Revert the edit**

Back in admin, edit Ipamorelin again, remove the `[FIRESTORE-EDIT-TEST]` suffix, save.

- [ ] **Step 6: Document the round-trip success**

Add a one-line note to `docs/handover/admin-guide.md` confirming the round-trip is verified, with date stamp. (Optional but recommended for handover audit trail.)

If the round-trip works end-to-end, **the Firestore migration is done.** Update memory in the next session.

---

## Self-Review

**Spec coverage:**
- ✅ Replace seed JSON reads with Firestore in `lib/products.ts` — Task 1
- ✅ Surface latent bugs unblocked by the migration — Task 2 (orderCounters path)
- ✅ Bring rules into alignment with code — Task 3
- ✅ Bootstrap Firestore data — Task 4
- ✅ Local proof of parity — Task 5
- ✅ Production cutover — Tasks 6 + 7
- ✅ Cleanup of migration debt — Task 8
- ✅ End-to-end admin verification — Task 9
- ✅ Rollback documented at Task 7 step 4

**Placeholder scan:** No "TBD", "implement appropriately", "similar to Task N" patterns. Each step has the exact code or command. The only "<paste>" placeholders are deploy URLs that can't be known until earlier tasks run — those are intentional.

**Type consistency:**
- `getProducts(options?: { category?: ProductCategory; activeOnly?: boolean; limit?: number })` — same signature in seed and Firestore branches
- `getProductBySlug(slug: string): Promise<Product | null>` — same
- `Product` type from `@/types` is the source of truth across all branches
- `isSeedMode()` returns boolean in both code paths
- The `getAdminDb()` return type is `Firestore | null` per `lib/firebase/admin.ts:46-49` — handled with `if (!db) throw` guard

**Risks not in tasks:**
- **Firestore composite index missing for `where('category','==',X) + where('active','==',true)`** — current `firestore.indexes.json` only has indexes for orders. If `getProducts({ category: 'peptides', activeOnly: true })` triggers an index error in production, Firebase Console will surface a one-click "create index" prompt. This is a known Firestore quirk — fix at the time, not pre-emptively.
- **Cold-start latency on first Firestore read** — admin SDK initialisation adds ~200ms to the first request after a Lambda cold start. Acceptable for Phase 1 (Cryogene won't have meaningful traffic until launch).

---

## Estimated effort

| Task | Effort |
|---|---|
| 1. Implement Firestore reads | 15 min |
| 2. Fix orderCounters path | 5 min |
| 3. Update rules | 5 min |
| 4. Seed Firestore | 10 min |
| 5. Local Firestore-mode build proof | 15 min |
| 6. Push + auto-deploy + smoke test | 15 min |
| 7. Vercel env-var swap + rules deploy + cutover smoke test | 15 min |
| 8. Remove override + cleanup | 10 min |
| 9. Admin round-trip verification | 20 min |
| **Total** | **~110 min** |

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-02-firestore-read-migration.md`.

Two execution options:

1. **Subagent-Driven (recommended for this plan)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Good fit because Tasks 1-4 are independent code changes and Tasks 5-9 are sequential infrastructure operations with explicit gates.

2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints for review. Good fit if you want to be hands-on during the cutover (Task 7) and admin round-trip (Task 9).

Which approach?
