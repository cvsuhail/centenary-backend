CREATE TABLE `task_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`task_id` int NOT NULL,
	`url` varchar(1000) NOT NULL,
	`type` varchar(50) NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`order_index` int NOT NULL DEFAULT 0,
	CONSTRAINT `task_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_completions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`task_id` int NOT NULL,
	`user_id` int NOT NULL,
	`completed_at` datetime NOT NULL DEFAULT '2026-04-20 10:50:03.761',
	CONSTRAINT `task_completions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-20 10:50:03.760';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-20 10:50:03.760';--> statement-breakpoint
ALTER TABLE `posts` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-20 10:50:03.761';--> statement-breakpoint
ALTER TABLE `posts` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-20 10:50:03.761';--> statement-breakpoint
ALTER TABLE `authors` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-20 10:50:03.761';--> statement-breakpoint
ALTER TABLE `authors` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-20 10:50:03.761';--> statement-breakpoint
ALTER TABLE `post_views` MODIFY COLUMN `viewed_at` datetime NOT NULL DEFAULT '2026-04-20 10:50:03.761';--> statement-breakpoint
ALTER TABLE `guest_views` MODIFY COLUMN `viewed_at` datetime NOT NULL DEFAULT '2026-04-20 10:50:03.761';--> statement-breakpoint
ALTER TABLE `tasks` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-20 10:50:03.761';--> statement-breakpoint
ALTER TABLE `tasks` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-20 10:50:03.761';--> statement-breakpoint
ALTER TABLE `announcements` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-20 10:50:03.761';--> statement-breakpoint
ALTER TABLE `announcements` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-20 10:50:03.761';--> statement-breakpoint
ALTER TABLE `event_config` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-20 10:50:03.761';--> statement-breakpoint
ALTER TABLE `stories` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-20 10:50:03.761';--> statement-breakpoint
ALTER TABLE `stories` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-20 10:50:03.761';--> statement-breakpoint
ALTER TABLE `story_views` MODIFY COLUMN `viewed_at` datetime NOT NULL DEFAULT '2026-04-20 10:50:03.761';--> statement-breakpoint
ALTER TABLE `guest_story_views` MODIFY COLUMN `viewed_at` datetime NOT NULL DEFAULT '2026-04-20 10:50:03.761';--> statement-breakpoint
ALTER TABLE `tasks` ADD `start_date` datetime NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `end_date` datetime NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `delegation` varchar(50);--> statement-breakpoint
ALTER TABLE `tasks` ADD `visible_to_guests` boolean DEFAULT false NOT NULL;