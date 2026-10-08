import { z } from "zod";
import { infrai } from "./infrai.ts";

export const reminderRequest = z.object({
  paymentId: z.string().min(1),
  dueDate: z.string().date(),
  reminderUrl: z.string().url()
});

export type ReminderRequest = z.infer<typeof reminderRequest>;

export function reminderCron(dueDate: string): string {
  const day = Number(dueDate.slice(8, 10));
  const month = Number(dueDate.slice(5, 7));
  return `0 9 ${day} ${month} *`;
}

export function auditPayload(input: ReminderRequest, jobId: string): string {
  return JSON.stringify({ event: "payment-reminder-scheduled", paymentId: input.paymentId, dueDate: input.dueDate, jobId });
}

export async function scheduleReminder(raw: unknown) {
  const input = reminderRequest.parse(raw);
  const job = await infrai.cron.create({ cron_expr: reminderCron(input.dueDate), task: input.reminderUrl });
  await infrai.queue.publish({ queue: "payment-reminder-audit", payload: auditPayload(input, job.job_id) });
  return { paymentId: input.paymentId, jobId: job.job_id, status: "scheduled" as const };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const raw = process.env.REMINDER_REQUEST ?? JSON.stringify({ paymentId: "invoice-42", dueDate: "2030-06-30", reminderUrl: "https://example.com/hooks/payment" });
  scheduleReminder(JSON.parse(raw)).then((result) => console.log(JSON.stringify(result))).catch((error) => { console.error(error); process.exitCode = 1; });
}
