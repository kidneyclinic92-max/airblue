CREATE TABLE `flights` (
	`flight_no` text PRIMARY KEY NOT NULL,
	`flight_date` text NOT NULL,
	`origin` text NOT NULL,
	`destination` text NOT NULL,
	`departure` text NOT NULL,
	`aircraft` text NOT NULL,
	`registration` text NOT NULL,
	`gate` text NOT NULL,
	`passengers` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`readiness` integer DEFAULT 0 NOT NULL,
	`supervisor` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_flights_flight_date` ON `flights` (`flight_date`);--> statement-breakpoint
CREATE INDEX `idx_flights_status` ON `flights` (`status`);