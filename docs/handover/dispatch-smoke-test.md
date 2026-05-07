# Dispatch smoke-test runbook

12-step walkthrough that validates the Phase 3 dispatch flow end-to-end
against stub adapters. Run after every Phase 3 deploy and before flipping
to real Royal Mail credentials. ~10 minutes.

## Pre-flight

- `COURIER_PLATFORM` unset OR `=stub` (you should see `stubCarrier` log lines on first request)
- `PRINTER_PLATFORM` unset OR `=stub`
- At least one paid order in the database (use admin to manually flip a pending order to paid, or run the seed)
- Logged in as admin

## Steps

1. **Empty queue state.** With no paid orders, browse `/admin/dispatch`.
   - Expected: "No paid orders awaiting dispatch."

2. **Single paid order in queue.** Create or flip an order to paid status.
   Refresh `/admin/dispatch`.
   - Expected: order appears with sub-state pill "In queue" (slate),
     service-code dropdown defaulted to TPN48, action button `[Generate label]`.

3. **Generate label success.** Click `[Generate label]`.
   - Expected:
     - Page reloads
     - Sub-state pill flips to "Label printed" (amber)
     - Actions: `[Packing slip]` `[Reprint]` `[Mark dispatched]` `[Void]`
     - Visit `/admin/orders/{id}` — `fulfilment.trackingNumber` populated, `printerStatus = "printed"`
     - Visit `/admin/audit-log` — new row `order.label_generated`

4. **Idempotency.** Open another tab to `/admin/dispatch` BEFORE clicking
   anything in the first tab. From the stale tab, click `[Generate label]` again.
   - Expected: server action returns `{ alreadyGenerated: true }` — no duplicate
     audit event, no duplicate carrier order. Pill state unchanged.

5. **Void label.** Click `[Void]`.
   - Expected:
     - Sub-state flips back to "In queue"
     - `fulfilment.trackingNumber` cleared
     - New audit event `order.label_voided`

6. **Simulated failure.** In the server environment, set `STUB_CARRIER_FAIL_NEXT=1`
   (one-shot — the flag is consumed on first call). From the dispatch console,
   click `[Generate label]`.
   - Expected: row shows red "Failed" pill with truncated error message and
     `[Retry]` button. Hovering the warning shows full error. `lastError` populated
     in the order doc.

7. **Retry success.** Click `[Retry]`.
   - Expected: sub-state flips to "Label printed". `lastError` cleared.

8. **Mark dispatched.** Click `[Mark dispatched]`.
   - Expected:
     - Row disappears (status flipped to `fulfilled`)
     - `/admin/orders/{id}` shows status = fulfilled, dispatchedAt + customerEmailedAt populated
     - Resend dashboard shows the OrderDispatched email sent
     - Customer browses `/account/orders/{id}` — TrackingTimeline section visible
       with "Awaiting Royal Mail collection" empty state

9. **Inbound tracking webhook.** With the order from step 8, simulate an RM webhook:

   ```bash
   BODY='{"trackingNumber":"<tracking-from-step-8>","status":"In transit","timestamp":"2026-05-08T15:00:00Z","location":"Birmingham Mail Centre"}'
   SIG=$(printf "%s" "$BODY" | openssl dgst -sha256 -hmac "$ROYALMAIL_TRACKING_WEBHOOK_SECRET" | awk '{print $2}')
   curl -X POST http://localhost:3000/api/webhooks/royalmail/tracking \
     -H "Content-Type: application/json" \
     -H "X-RoyalMail-Signature: $SIG" \
     -d "$BODY"
   ```

   - Expected: 200 OK. Customer page shows "In transit" milestone in the
     timeline with the timestamp + location.

10. **Webhook idempotency.** Run the same curl twice.
    - Expected: second response includes `deduped: true`. No duplicate
      timeline event. No duplicate audit event.

11. **Run batch now.** Create 5 paid orders (or seed extras). Click
    `[Run batch now]` in the dispatch console header.
    - Expected: all 5 transition to "Label printed" within ~30 seconds
      (sequential generation — Click & Drop rate-limits at 30 req/min).
      Last-batch summary updates: "5 processed, 0 failed".
    - Check Firestore `dispatchBatchRuns` collection — new doc with summary.

12. **Mark all dispatched.** With all 5 in "Label printed" state, click
    `[Mark all printed as dispatched (5)]` in the header. Confirm dialog.
    - Expected: all 5 flip to fulfilled. 5 emails fan out via Resend
      (check Resend dashboard for batch). Dispatch queue empties.

## After all 12 steps pass

Switch to live mode in stages:

1. **Sandbox stage.** Set `COURIER_PLATFORM=royalmail`, set
   `ROYALMAIL_CLICK_AND_DROP_API_KEY` to Sam's sandbox API key, set
   `ROYALMAIL_CLICK_AND_DROP_BASE_URL=https://api.parcel.royalmail.com/sandbox`.
   Re-run steps 2, 3, 5, 8, 11 against the sandbox. Verify real RM
   `orderIdentifier` and `trackingNumber` come back.

2. **Production stage.** Switch `ROYALMAIL_CLICK_AND_DROP_BASE_URL` to
   production (or unset to use the default). Run steps 2, 3, 8 once more
   on a low-value test order to an internal address. Confirm a real label
   prints on Sam's Zebra and a real tracking number appears.

3. **Open to customers.** Toggle `config.dispatch.enabled = true` via
   `/admin/settings` if not already set, and confirm the daily Cloud Function
   schedule triggers at 13:00 the next working day.

## Failure recovery

If anything in the smoke test fails:

- **Stub failure that wasn't `STUB_CARRIER_FAIL_NEXT=1`** — bug in stub
  adapter; check stub.ts
- **Type error at runtime** — likely the Timestamp client/admin SDK
  mismatch; the casts in `app/api/webhooks/royalmail/tracking/route.ts`
  may need extending
- **Webhook 401** — HMAC mismatch. Check `ROYALMAIL_TRACKING_WEBHOOK_SECRET`
  matches between your env and the curl `openssl dgst -hmac` arg
- **Mark dispatched fails with "label not printed"** — check the order's
  `fulfilment.printerStatus` in Firestore — may be `pending` or `failed`
  rather than `printed`
- **Run batch finds 0 orders despite paid orders existing** — confirm the
  Firestore composite index on `status + printerStatus + createdAt` has
  deployed. If not: `firebase deploy --only firestore:indexes`
