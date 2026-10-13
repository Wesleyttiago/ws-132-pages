CREATE TABLE `auth_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`failures` integer NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`expires` integer NOT NULL
);
