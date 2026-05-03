# Stage 1b Deployment Checklist

This checklist walks you through setting up the live site infrastructure. Work through each step in order. If anything is unclear, stop and contact David before proceeding.

Estimated time: 3-4 hours (spread across two sessions).

---

## Phase A: Firebase Setup

**Step 1: Create a Firebase project**

Go to [console.firebase.google.com](https://console.firebase.google.com) and sign in with a Google account you control (preferably a business Google account, not a personal Gmail). Click "Create a project" and give it a name such as `cryogene-prod`. When asked about Google Analytics, you can skip it — click "Continue without Google Analytics". Wait for the project to be created. [SCREENSHOT: Firebase project creation screen]

**Step 2: Enable Firestore**

In the left sidebar, click "Build" then "Firestore Database". Click "Create database". When asked for a location, choose **europe-west2 (London)**. Choose "Start in production mode" — our security rules will be deployed separately. Click "Create". [SCREENSHOT: Firestore region selection showing europe-west2]

**Step 3: Enable Storage**

In the left sidebar, click "Build" then "Storage". Click "Get started". When asked for a location, choose **europe-west2** (same as Firestore). Accept the default rules for now — we will deploy the correct rules in Phase E. [SCREENSHOT: Storage setup screen]

**Step 4: Enable Authentication**

In the left sidebar, click "Build" then "Authentication". Click "Get started". Click "Email/Password" under Sign-in providers and enable it. You do not need to enable any other providers for Stage 1b. [SCREENSHOT: Authentication sign-in providers screen]

**Step 5: Generate a service account key**

In the left sidebar, click the gear icon next to "Project Overview", then click "Project settings". Click the "Service accounts" tab. Click "Generate new private key" and then "Generate key". A JSON file will be downloaded to your computer — this file contains credentials that give full admin access to your Firebase project. **Share this file with David securely — do not email it or share it via Slack or any unencrypted channel. Use Signal or a password-managed file share.** [SCREENSHOT: Service accounts tab showing "Generate new private key" button]

---

## Phase B: GitHub and Code Repository

**Step 6: Create a GitHub account (if you don't have one)**

Go to [github.com](https://github.com) and sign up for a free account. Use your business email address. Once created, send David your GitHub username so he can add you as a collaborator on the repository. You don't need to do anything else in GitHub — David will push the code.

**Step 7: Wait for David to push the code**

Once David has your GitHub username, he will push the project code to a private repository and add you as a collaborator. You will receive an email invitation — accept it. The repository will be visible at `github.com/[your-username]/peptide-store` or similar.

---

## Phase C: Vercel Deployment

**Step 8: Create a Vercel account**

Go to [vercel.com](https://vercel.com) and click "Sign up". Choose "Continue with GitHub" — this links your Vercel account directly to your GitHub repositories. Vercel is where the website will be hosted. [SCREENSHOT: Vercel sign-up page]

**Step 9: Import the repository**

On the Vercel dashboard, click "Add New..." then "Project". Find the `peptide-store` repository in the list and click "Import". On the next screen, leave all settings as the defaults — Vercel will detect that it is a Next.js project automatically. Do not click "Deploy" yet. [SCREENSHOT: Vercel project import screen]

**Step 10: Add environment variables**

Before deploying, you need to add the following environment variables. In the project settings in Vercel, click "Environment Variables" and add each of these:

| Variable | Value | Where to find it |
|----------|-------|-----------------|
| `FIREBASE_PROJECT_ID` | Your Firebase project ID (e.g. `cryogene-prod`) | Firebase console → Project settings → General |
| `FIREBASE_CLIENT_EMAIL` | The `client_email` from the service account JSON file | Inside the JSON file David helped you download |
| `FIREBASE_PRIVATE_KEY` | The `private_key` from the service account JSON, encoded as Base64 | David will encode this for you — it's a multi-line value |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web API key | Firebase console → Project settings → General → Web API key |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Same as `FIREBASE_PROJECT_ID` | As above |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Your storage bucket name (e.g. `cryogene-prod.appspot.com`) | Firebase console → Storage |
| `NEXT_PUBLIC_SITE_URL` | Your production domain (e.g. `https://cryogene.co.uk`) | Whatever domain you purchase in Step 13 |
| `NEXT_PUBLIC_SITE_NAME` | Your store name (e.g. `Cryogene`) | As decided |
| `RESEND_API_KEY` | Your Resend API key | See Step 11 |
| `ADMIN_DEV_BYPASS` | Leave empty or do not add this variable | This must NOT be set in production |

Once all variables are added, click "Deploy". The first deployment will take a few minutes. [SCREENSHOT: Vercel environment variables screen]

---

## Phase D: Email Setup (Resend)

**Step 11: Create a Resend account**

Go to [resend.com](https://resend.com) and sign up with your business email. Resend is the service that sends order confirmation emails to your customers. On the free plan, you can send up to 3,000 emails per month, which is more than enough to start. [SCREENSHOT: Resend dashboard]

**Step 12: Verify your domain in Resend**

In the Resend dashboard, click "Domains" then "Add domain". Enter your domain name (e.g. `cryogene.co.uk`). Resend will give you DNS records to add — typically one TXT record for ownership verification and two MX records. Add these to your domain registrar's DNS settings (see Step 13 for domain setup). Once the DNS records propagate (usually within a few hours), your domain will show as verified. Once verified, click "API Keys", create a new key, and copy it into the `RESEND_API_KEY` environment variable in Vercel.

---

## Phase E: Domain and DNS

**Step 13: Purchase a domain**

Buy your domain from a reputable UK registrar such as [Namecheap](https://namecheap.com), [123-reg](https://123-reg.co.uk), or [IONOS](https://ionos.co.uk). David recommends Namecheap for ease of use. Your domain should ideally match your business name (e.g. `cryogene.co.uk`).

**Step 14: Connect the domain to Vercel**

In Vercel, go to your project, click "Settings" then "Domains". Click "Add" and type your domain name. Vercel will display DNS records to add at your registrar — typically an A record pointing to Vercel's IP address, and a CNAME for the `www` subdomain. Log in to your domain registrar and add these records. DNS changes can take up to 48 hours to propagate globally, but typically take under an hour. Once propagated, your site will be live at your domain. [SCREENSHOT: Vercel domain settings screen]

**Step 15: Update NEXT_PUBLIC_SITE_URL**

Once your domain is working, update the `NEXT_PUBLIC_SITE_URL` environment variable in Vercel to your live domain (e.g. `https://cryogene.co.uk`). Vercel will trigger a new deployment automatically.

---

## Phase F: Data and Admin Access

**Step 16: Seed the product catalogue**

Once the site is deployed and the Firebase credentials are in Vercel, David will run the seed script on his machine to push the product catalogue into Firestore:

```bash
npm run seed:firestore
```

This pushes all the products from `data/products.seed.json` into your live Firestore database. You will see a confirmation in the terminal for each product. This step is done by David, not you.

**Step 17: Create your admin account**

Go to your live site and sign up for an account using your business email address. Complete the sign-up flow normally. Once your account is created, David will run the admin grant script:

```bash
npm run admin:grant your-email@example.com
```

This grants your account admin access. **After this step, you must sign out and sign back in for the change to take effect.** Once you sign back in, you will see the `/admin` menu option. [SCREENSHOT: Site sign-up page]

**Step 18: Verify admin access**

Navigate to `/admin` on your live site. You should see the admin dashboard with your products listed. Click through a product to confirm the edit form loads. Navigate to `/admin/settings` and fill in your store name, address, VAT status, shipping rate, and notification email. Click Save. [SCREENSHOT: Admin dashboard]

---

## Phase G: Security Rules and Search Engines

**Step 19: Deploy security rules**

David will deploy the Firestore and Storage security rules using the Firebase CLI:

```bash
firebase deploy --only firestore:rules,storage:rules --project cryogene-prod
```

This locks down your database so that only the right people can read and write each collection. This step is done by David.

**Step 20: Enable Firestore weekly export**

In the Firebase console, go to "Firestore Database" then "Usage". Click "Schedule export" and set up a weekly export to Firebase Storage. This is your database backup. [SCREENSHOT: Firestore export scheduling screen]

**Step 21: Register with Google Search Console**

Go to [search.google.com/search-console](https://search.google.com/search-console) and add your property (your domain). Verify ownership via the DNS method — Google will give you a TXT record to add at your registrar, the same way you added Resend's records. Once verified, click "Sitemaps" in the left menu and submit `https://yourdomain.co.uk/sitemap.xml`. Google will begin indexing your site within a few days. [SCREENSHOT: Google Search Console verification screen]

**Step 22: Register with Bing Webmaster Tools**

Go to [bing.com/webmasters](https://bing.com/webmasters) and sign in with a Microsoft account. Add your site and verify ownership. Submit your sitemap. Bing shares its index with several other search engines, so this one step covers multiple platforms.

---

## Pre-launch sign-off

Before announcing the site to anyone, confirm the following with David:

- [ ] All legal pages have been reviewed by your solicitor and `reviewed: false` has been updated to `reviewed: true` in the content files
- [ ] You have placed a test order on the live site and confirmed it appeared in `/admin/orders`
- [ ] You have confirmed the order confirmation email arrived at your inbox
- [ ] Store name, address, and VAT status are set correctly in Settings
- [ ] Pricing has been set for all products (no "Pricing TBC" variants)
- [ ] `ADMIN_DEV_BYPASS` is NOT set in Vercel (confirm in Environment Variables)

---

## Plan A deploy actions (audit log + customer events + sign-in counter)

These are one-time actions that run **after** `git push origin main` triggers
the Vercel auto-deploy and **after** the new Firestore rules + indexes have
been deployed.

1. **Deploy Firestore rules** — admin SDK still bypasses, but this enforces
   client-side hard-deny:
   ```bash
   npx firebase-tools deploy --only firestore:rules
   ```

2. **Deploy Firestore indexes** — 3 audit + 4 customer-events composite
   indexes. Wait for "READY" status in Firebase Console before relying:
   ```bash
   npx firebase-tools deploy --only firestore:indexes
   ```

3. **Enable TTL policies** in Firebase Console → Firestore → TTL:
   - `auditLogs.createdAt` — 7 years (HMRC business-record retention)
   - `customerEvents.createdAt` — 24 months (GDPR data minimisation)
   - `signInAttempts.lastFailureAt` — 24 hours (counter records auto-expire)

4. **Verify** by signing into admin UI, visiting `/admin/audit-log`,
   confirming the empty-state renders without error. Edit a product → return
   to viewer → confirm a `product.updated` row appears with diff visible in
   the drill-down panel.
