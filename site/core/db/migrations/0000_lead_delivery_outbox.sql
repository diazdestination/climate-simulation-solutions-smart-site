CREATE TABLE `lead_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`target_origin` text NOT NULL,
	`request_id` text NOT NULL,
	`payload_hash` text NOT NULL,
	`ciphertext` text,
	`state` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`lease_token` text,
	`last_code` text,
	`lead_id` text,
	`receipt_id` text,
	`created_at` integer NOT NULL,
	`delivered_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lead_outbox_request_uq` ON `lead_outbox` (`site_id`,`target_origin`,`request_id`);--> statement-breakpoint
CREATE INDEX `lead_outbox_due_idx` ON `lead_outbox` (`site_id`,`target_origin`,`state`,`next_attempt_at`);