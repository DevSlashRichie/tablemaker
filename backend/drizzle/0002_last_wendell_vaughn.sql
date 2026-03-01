PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_tables` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`image_url` text,
	`max_players` integer DEFAULT 5 NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_tables`("id", "game_id", "title", "description", "image_url", "max_players", "is_archived", "created_at", "updated_at") SELECT "id", "game_id", "title", "description", "image_url", "max_players", "is_archived", "created_at", "updated_at" FROM `tables`;--> statement-breakpoint
DROP TABLE `tables`;--> statement-breakpoint
ALTER TABLE `__new_tables` RENAME TO `tables`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `games` ADD `event_timestamp` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `games` ADD `location` text NOT NULL;