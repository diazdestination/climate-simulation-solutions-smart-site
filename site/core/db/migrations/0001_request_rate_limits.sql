CREATE TABLE `request_rate_limits` (
	`bucket` text PRIMARY KEY NOT NULL,
	`hits` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `request_rate_limits_expiry_idx` ON `request_rate_limits` (`expires_at`);