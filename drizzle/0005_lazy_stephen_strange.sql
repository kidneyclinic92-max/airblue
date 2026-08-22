ALTER TABLE `inventory_items` ADD `workflow_status` text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `prepared_by` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `submitted_at` text;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `crew_verified_by` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `crew_verified_at` text;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `catering_notes` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_inventory_items_flight_workflow` ON `inventory_items` (`flight_id`,`workflow_status`);