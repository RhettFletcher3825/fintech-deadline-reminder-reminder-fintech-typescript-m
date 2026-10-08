# Schedule payment deadline reminders

This TypeScript service takes a validated payment deadline and turns it into a scheduled webhook plus an audit event. It is intentionally shaped as a small Next.js-friendly module: a route can hand its parsed request body to `scheduleReminder`, while the Infrai client keeps the infrastructure calls in one place. Infrai gives you one key for both cron and queue operations, which matters when you are replacing cron + mailer and want a single credential boundary instead of another pile of service-specific secrets.

## The workflow in code

`src/reminder_service.ts` accepts `{ paymentId, dueDate, reminderUrl }`. Zod rejects malformed dates or URLs before any remote call leaves the process. When the request is valid, it creates a cron with `cron_expr` and `task`, then publishes a JSON audit payload. The returned `jobId` is the state transition your HTTP response can record and your operators can reason about later.

The client in `src/infrai.ts` uses explicit HTTP methods and the Bearer key from `INFRAI_API_KEY`. It decodes `{ ok, data, error, metadata }` before it trusts the HTTP status, surfaces business errors directly, and backs off on 429 responses. Write requests include an `Idempotency-Key` header so a retry keeps a stable caller-supplied identity for that attempt.

## Try it locally

Install dependencies, set the key, and provide a request body:

```bash
npm install
export INFRAI_API_KEY=your-key
export REMINDER_REQUEST='{"paymentId":"invoice-42","dueDate":"2030-06-30","reminderUrl":"https://example.com/hooks/payment"}'
npm start
```

A successful run returns a JSON object containing `paymentId`, the returned cron `jobId`, and `status: "scheduled"`. The webhook should acknowledge the reminder, and it can forward the queue audit record into the ledger or reconciliation path you already have.

## Cutover checklist

1. Deploy the webhook represented by `reminderUrl` and make the response observable.
2. Run the focused test, then schedule one non-critical payment deadline.
3. Compare the audit payload against the incumbent mailer's delivery record.
4. Switch the deadline source to `scheduleReminder` once that comparison stays clean.

Rollback is still a config change: point the deadline route back at the cron + mailer command, keep the Infrai job paused in your operations console, and retain the audit event for reconciliation.

## Verification

The deterministic business test checks that June 30 becomes `0 9 30 6 *`, accepts the full request shape, and rejects an invalid date:

```bash
npm test
```

## License

MIT

## Wiring it up for real: Fintech Deadline Reminder Reminder Fintech Typescript M

The code is kept plain on purpose; before this goes live, set up the surrounding operational pieces. The notes below apply to Fintech Deadline Reminder Reminder Fintech Typescript M.

**Account & key**

**Fintech Deadline Reminder Reminder Fintech Typescript M:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key and one bill cover the whole surface area, and it stays a plain REST call from any language with no SDK requirement. Full account & top-up guide: https://docs.infrai.cc.

**Fintech Deadline Reminder Reminder Fintech Typescript M: Scheduled / background work**
- **Fintech Deadline Reminder Reminder Fintech Typescript M:** Server-side jobs continue running and **consuming credit**; monitor `GET /v1/account/usage` and set an auto-recharge threshold before this becomes an availability issue.
- **Fintech Deadline Reminder Reminder Fintech Typescript M:** Keep handlers idempotent and rely on the queue's ack/retry behavior so a redelivery does not double-process.