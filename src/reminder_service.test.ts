import assert from "node:assert/strict";
import { reminderCron, reminderRequest } from "./reminder_service.ts";

const input = { paymentId: "invoice-42", dueDate: "2030-06-30", reminderUrl: "https://example.com/hooks/payment" };
assert.equal(reminderCron(input.dueDate), "0 9 30 6 *");
assert.equal(reminderRequest.parse(input).paymentId, "invoice-42");
assert.throws(() => reminderRequest.parse({ ...input, dueDate: "tomorrow" }));
console.log("reminder decision checks passed");
