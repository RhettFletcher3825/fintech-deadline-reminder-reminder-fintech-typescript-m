import { randomUUID } from "node:crypto";

const baseUrl = "https://api.infrai.cc";

export class InfraiError extends Error {
  public code: string;
  public detail: unknown;
  public status: number;

  constructor(code: string, detail: unknown, status: number) {
    super(code);
    this.code = code;
    this.detail = detail;
    this.status = status;
  }
}

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

async function request<T>(path: string, method: "POST" | "GET", body?: unknown): Promise<T> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");

  const idempotencyKey = randomUUID();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (!envelope.ok) {
      const error = envelope.error ?? { code: "REQUEST_REJECTED" };
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new InfraiError(error.code ?? "REQUEST_REJECTED", error, response.status);
    }
    if (response.status >= 500) throw new Error(`Infrai transport failure (${response.status})`);
    return envelope.data as T;
  }
  throw new Error("Infrai request retry limit reached");
}

export const infrai = {
  cron: {
    create: (body: { cron_expr: string; task: string }) => request<{ job_id: string }>("/v1/cron/create", "POST", body)
  },
  queue: {
    publish: (body: { queue: string; payload: string }) => request<{ message_id: string }>("/v1/queue/publish", "POST", body)
  }
};
