CREATE TABLE `authors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`position` varchar(255) NOT NULL,
	`dp` varchar(1000),
	`created_at` datetime NOT NULL DEFAULT '2026-04-18 11:22:34.160',
	`updated_at` datetime NOT NULL DEFAULT '2026-04-18 11:22:34.160',
	CONSTRAINT `authors_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_author` UNIQUE(`name`,`position`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-18 11:22:34.159';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-18 11:22:34.160';--> statement-breakpoint
ALTER TABLE `posts` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-18 11:22:34.160';--> statement-breakpoint
ALTER TABLE `posts` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-18 11:22:34.160';--> statement-breakpoint
ALTER TABLE `post_views` MODIFY COLUMN `viewed_at` datetime NOT NULL DEFAULT '2026-04-18 11:22:34.160';--> statement-breakpoint
ALTER TABLE `guest_views` MODIFY COLUMN `viewed_at` datetime NOT NULL DEFAULT '2026-04-18 11:22:34.160';--> statement-breakpoint
ALTER TABLE `tasks` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-18 11:22:34.160';--> statement-breakpoint
ALTER TABLE `tasks` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-18 11:22:34.160';--> statement-breakpoint
ALTER TABLE `announcements` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-18 11:22:34.160';--> statement-breakpoint
ALTER TABLE `announcements` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-18 11:22:34.160';--> statement-breakpoint
ALTER TABLE `event_config` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-18 11:22:34.160';