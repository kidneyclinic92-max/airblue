CREATE TABLE `handovers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from_flight_id` text NOT NULL,
	`to_flight_no` text NOT NULL,
	`to_route` text NOT NULL,
	`to_crew` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'sent' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`flight_id` text NOT NULL,
	`category` text NOT NULL,
	`name` text NOT NULL,
	`location` text NOT NULL,
	`required_count` integer NOT NULL,
	`loaded_count` integer NOT NULL,
	`unit` text NOT NULL,
	`checked` integer DEFAULT false NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
