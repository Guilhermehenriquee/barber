CREATE TABLE `appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`barber_shop_id` text NOT NULL,
	`client_id` text NOT NULL,
	`professional_id` text NOT NULL,
	`service_id` text NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`status` text NOT NULL,
	`notes` text,
	`source` text DEFAULT 'client' NOT NULL,
	`created_by_user_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_appointments_shop_start` ON `appointments` (`barber_shop_id`,`starts_at`);--> statement-breakpoint
CREATE INDEX `idx_appointments_client_start` ON `appointments` (`barber_shop_id`,`client_id`,`starts_at`);--> statement-breakpoint
CREATE INDEX `idx_appointments_professional_start` ON `appointments` (`barber_shop_id`,`professional_id`,`starts_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_appointments_professional_start_active_unique` ON `appointments` (`barber_shop_id`,`professional_id`,`starts_at`) WHERE status in ('scheduled', 'confirmed', 'in_service');--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_auth_sessions_token_hash_unique` ON `auth_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_auth_sessions_user` ON `auth_sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `barber_shops` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`logo_url` text,
	`phone` text,
	`address` text,
	`timezone` text DEFAULT 'America/Sao_Paulo' NOT NULL,
	`theme_json` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_barber_shops_slug_unique` ON `barber_shops` (`slug`);--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`barber_shop_id` text NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`notes` text,
	`preferences` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_clients_shop_phone` ON `clients` (`barber_shop_id`,`phone`);--> statement-breakpoint
CREATE INDEX `idx_clients_user` ON `clients` (`user_id`);--> statement-breakpoint
CREATE TABLE `professionals` (
	`id` text PRIMARY KEY NOT NULL,
	`barber_shop_id` text NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`public_name` text NOT NULL,
	`color` text DEFAULT '#8f2638' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_professionals_shop_active` ON `professionals` (`barber_shop_id`,`active`);--> statement-breakpoint
CREATE INDEX `idx_professionals_user` ON `professionals` (`user_id`);--> statement-breakpoint
CREATE TABLE `services` (
	`id` text PRIMARY KEY NOT NULL,
	`barber_shop_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`duration_minutes` integer NOT NULL,
	`buffer_minutes` integer DEFAULT 10 NOT NULL,
	`price_cents` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_services_shop_active` ON `services` (`barber_shop_id`,`active`);--> statement-breakpoint
CREATE TABLE `time_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`barber_shop_id` text NOT NULL,
	`professional_id` text NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_time_blocks_professional_start` ON `time_blocks` (`barber_shop_id`,`professional_id`,`starts_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`barber_shop_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`role` text NOT NULL,
	`password_salt` text NOT NULL,
	`password_hash` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_shop_email_unique` ON `users` (`barber_shop_id`,`email`);--> statement-breakpoint
CREATE INDEX `idx_users_shop_role` ON `users` (`barber_shop_id`,`role`);--> statement-breakpoint
CREATE TABLE `working_hours` (
	`id` text PRIMARY KEY NOT NULL,
	`barber_shop_id` text NOT NULL,
	`professional_id` text NOT NULL,
	`weekday` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`break_start` text,
	`break_end` text,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_working_hours_professional_weekday` ON `working_hours` (`barber_shop_id`,`professional_id`,`weekday`);