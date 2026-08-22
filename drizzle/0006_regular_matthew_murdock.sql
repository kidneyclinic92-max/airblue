CREATE TABLE `handover_signatures` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`handover_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`signer_name` text NOT NULL,
	`employee_id` text NOT NULL,
	`purpose` text NOT NULL,
	`card_fingerprint` text NOT NULL,
	`signature_hash` text NOT NULL,
	`validation_status` text DEFAULT 'valid' NOT NULL,
	`signed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_handover_signatures_handover_purpose` ON `handover_signatures` (`handover_id`,`purpose`);--> statement-breakpoint
CREATE INDEX `idx_handover_signatures_user_id` ON `handover_signatures` (`user_id`);--> statement-breakpoint
CREATE TABLE `rfid_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`purpose` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_rfid_challenges_user_expiry` ON `rfid_challenges` (`user_id`,`expires_at`);--> statement-breakpoint
CREATE TABLE `rfid_credentials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`card_hash` text NOT NULL,
	`card_fingerprint` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`enrolled_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_used_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_rfid_credentials_card_hash` ON `rfid_credentials` (`card_hash`);--> statement-breakpoint
CREATE INDEX `idx_rfid_credentials_user_active` ON `rfid_credentials` (`user_id`,`active`);