// Operator monitor (Node-only). Inspect-only, authenticated call to the site's outbox
// operations endpoint; prints aggregate counts, never contact data. Ported from Painless.
// Env: SITE_OUTBOX_STATUS_URL, SITE_OUTBOX_DRAIN_SECRET (PAINLESS_* aliases accepted).
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeEnv } from "../worker/env.js";

export const MAX_PENDING_AGE_MS = 15 * 60_000;

export function evaluateOutboxSummary(summary, now = Date.now()) {
  if (summary?.scope !== "configured-site-only" || !Array.isArray(summary.states)) {
    throw new Error("invalid_outbox_summary");
  }
  const counts = { pending: 0, review: 0 };
  let oldestPendingAt = null;
  for (const row of summary.states) {
    if (
      !["pending", "review", "delivered"].includes(row?.state) ||
      !Number.isInteger(row.count) ||
      row.count < 0
    ) {
      throw new Error("invalid_outbox_summary");
    }
    if (row.state === "pending") {
      counts.pending += row.count;
      const createdAt = Number(row.oldestCreatedAt);
      if (row.count && (!Number.isFinite(createdAt) || createdAt <= 0)) {
        throw new Error("invalid_outbox_summary");
      }
      if (row.count) oldestPendingAt = Math.min(oldestPendingAt ?? createdAt, createdAt);
    }
    if (row.state === "review") counts.review += row.count;
  }
  const oldestPendingAgeMs = oldestPendingAt === null ? 0 : Math.max(0, now - oldestPendingAt);
  return {
    status: counts.review || oldestPendingAgeMs > MAX_PENDING_AGE_MS ? "attention" : "ok",
    ...counts,
    oldestPendingAgeMs,
  };
}

function statusUrl(raw) {
  const url = new URL(raw);
  const loopback = ["localhost", "127.0.0.1"].includes(url.hostname);
  if (
    url.pathname !== "/api/internal/lead-outbox" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password ||
    !(url.protocol === "https:" || (loopback && url.protocol === "http:"))
  ) {
    throw new Error("invalid_status_url");
  }
  return url;
}

export async function checkOutboxHealth(rawEnv = process.env, fetchImpl = fetch) {
  const env = normalizeEnv(rawEnv);
  const url = statusUrl(env.SITE_OUTBOX_STATUS_URL ?? "");
  const secret = env.SITE_OUTBOX_DRAIN_SECRET ?? "";
  if (!/^[a-f0-9]{64}$/.test(secret)) throw new Error("missing_operator_secret");
  const response = await fetchImpl(url, {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(8_000),
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ inspectOnly: true }),
  });
  if (!response.ok) throw new Error("outbox_status_unavailable");
  return evaluateOutboxSummary(await response.json());
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    const result = await checkOutboxHealth();
    const ageMinutes = Math.floor(result.oldestPendingAgeMs / 60_000);
    process.stdout.write(
      `Site outbox ${result.status}: pending=${result.pending}, review=${result.review}, oldest-pending-minutes=${ageMinutes}\n`,
    );
    if (result.status !== "ok") process.exitCode = 2;
  } catch {
    process.stderr.write("Site outbox status unavailable; investigate operator configuration or delivery.\n");
    process.exitCode = 3;
  }
}
