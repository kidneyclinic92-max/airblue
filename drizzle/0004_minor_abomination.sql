CREATE TABLE `cabin_defects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`flight_no` text NOT NULL,
	`aircraft_registration` text NOT NULL,
	`equipment_type` text NOT NULL,
	`defect_type` text NOT NULL,
	`description` text NOT NULL,
	`cabin_location` text NOT NULL,
	`safety_hazard` integer DEFAULT false NOT NULL,
	`engineer_required` integer DEFAULT false NOT NULL,
	`mel_classification` text DEFAULT 'none' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`engineer_notes` text DEFAULT '' NOT NULL,
	`reported_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`resolved_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_cabin_defects_flight_no` ON `cabin_defects` (`flight_no`);--> statement-breakpoint
CREATE INDEX `idx_cabin_defects_status` ON `cabin_defects` (`status`);--> statement-breakpoint
CREATE INDEX `idx_cabin_defects_equipment_type` ON `cabin_defects` (`equipment_type`);--> statement-breakpoint
CREATE TABLE `crew_assignments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`flight_no` text NOT NULL,
	`user_id` integer,
	`crew_name` text NOT NULL,
	`employee_id` text NOT NULL,
	`assignment_role` text NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_crew_assignments_flight_no` ON `crew_assignments` (`flight_no`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_crew_assignments_flight_employee` ON `crew_assignments` (`flight_no`,`employee_id`);--> statement-breakpoint
CREATE TABLE `crew_plans` (
	`flight_no` text PRIMARY KEY NOT NULL,
	`base_cabin_crew` integer NOT NULL,
	`lead_crew` integer DEFAULT 1 NOT NULL,
	`additional_crew` integer DEFAULT 0 NOT NULL,
	`double_crew` integer DEFAULT false NOT NULL,
	`required_total` integer NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `department_handovers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`flight_no` text NOT NULL,
	`department` text NOT NULL,
	`subject` text NOT NULL,
	`notes` text NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`status` text DEFAULT 'sent' NOT NULL,
	`sent_by` text NOT NULL,
	`recipient` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_department_handovers_flight_no` ON `department_handovers` (`flight_no`);--> statement-breakpoint
CREATE INDEX `idx_department_handovers_department_status` ON `department_handovers` (`department`,`status`);