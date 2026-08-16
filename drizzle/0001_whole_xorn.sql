CREATE INDEX `idx_handovers_from_flight_id` ON `handovers` (`from_flight_id`);--> statement-breakpoint
CREATE INDEX `idx_inventory_items_flight_id` ON `inventory_items` (`flight_id`);