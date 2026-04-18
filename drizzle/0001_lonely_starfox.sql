CREATE TABLE `guest_reactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`post_id` int NOT NULL,
	`guest_id` varchar(36) NOT NULL,
	`type` varchar(50) NOT NULL,
	CONSTRAINT `guest_reactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_guest_reaction` UNIQUE(`post_id`,`guest_id`)
);
--> statement-breakpoint
CREATE TABLE `post_views` (
	`post_id` int NOT NULL,
	`user_id` int NOT NULL,
	`viewed_at` datetime NOT NULL DEFAULT '2026-04-18 10:08:37.360',
	CONSTRAINT `post_views_post_id_user_id_pk` PRIMARY KEY(`post_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `guest_views` (
	`post_id` int NOT NULL,
	`guest_id` varchar(36) NOT NULL,
	`viewed_at` datetime NOT NULL DEFAULT '2026-04-18 10:08:37.360',
	CONSTRAINT `guest_views_post_id_guest_id_pk` PRIMARY KEY(`post_id`,`guest_id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-18 10:08:37.359';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-18 10:08:37.359';--> statement-breakpoint
ALTER TABLE `posts` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-18 10:08:37.360';--> statement-breakpoint
ALTER TABLE `posts` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-18 10:08:37.360';--> statement-breakpoint
ALTER TABLE `tasks` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-18 10:08:37.360';--> statement-breakpoint
ALTER TABLE `tasks` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-18 10:08:37.360';--> statement-breakpoint
ALTER TABLE `announcements` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-18 10:08:37.360';--> statement-breakpoint
ALTER TABLE `announcements` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-18 10:08:37.360';--> statement-breakpoint
ALTER TABLE `event_config` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-18 10:08:37.360';--> statement-breakpoint
ALTER TABLE `posts` ADD `author_position` varchar(255);--> statement-breakpoint
ALTER TABLE `posts` ADD `is_home_feed` boolean DEFAULT false NOT NULL;