CREATE TABLE `crew_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_crew_sessions_token_hash` ON `crew_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_crew_sessions_user_id` ON `crew_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_crew_sessions_expires_at` ON `crew_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `crew_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`full_name` text NOT NULL,
	`employee_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`station` text DEFAULT 'ISB' NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`password_iterations` integer DEFAULT 150000 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_crew_users_email` ON `crew_users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_crew_users_employee_id` ON `crew_users` (`employee_id`);