// Reference Drizzle schema for the lead_outbox journal (not executed by the worker;
// drizzle-orm is NOT a dependency of the starter). The authoritative DDL is
// core/db/migrations/*.sql, applied by wrangler d1 migrations / the host.
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// Delivery journal only. GrowthOS remains the canonical customer/lead store.
export const leadOutbox = sqliteTable(
  "lead_outbox",
  {
    id: text("id").primaryKey(),
    siteId: text("site_id").notNull(),
    targetOrigin: text("target_origin").notNull(),
    requestId: text("request_id").notNull(),
    payloadHash: text("payload_hash").notNull(),
    ciphertext: text("ciphertext"),
    state: text("state", {
      enum: ["pending", "delivered", "review"],
    }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: integer("next_attempt_at").notNull(),
    leaseUntil: integer("lease_until").notNull().default(0),
    leaseToken: text("lease_token"),
    lastCode: text("last_code"),
    leadId: text("lead_id"),
    receiptId: text("receipt_id"),
    createdAt: integer("created_at").notNull(),
    deliveredAt: integer("delivered_at"),
  },
  (t) => [
    uniqueIndex("lead_outbox_request_uq").on(
      t.siteId,
      t.targetOrigin,
      t.requestId,
    ),
    index("lead_outbox_due_idx").on(
      t.siteId,
      t.targetOrigin,
      t.state,
      t.nextAttemptAt,
    ),
  ],
);

// Short-lived abuse counters. Buckets hold a hashed client address, never a raw IP.
export const requestRateLimits = sqliteTable(
  "request_rate_limits",
  {
    bucket: text("bucket").primaryKey(),
    hits: integer("hits").notNull().default(0),
    expiresAt: integer("expires_at").notNull(),
  },
  (t) => [index("request_rate_limits_expiry_idx").on(t.expiresAt)],
);
