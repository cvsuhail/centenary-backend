CREATE TABLE `stories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`author_id` int NOT NULL,
	`author_name` varchar(255) NOT NULL,
	`author_position` varchar(255) NOT NULL,
	`author_dp` varchar(1000),
	`visible_to_guests` boolean NOT NULL DEFAULT true,
	`visible_to_delegates` boolean NOT NULL DEFAULT true,
	`special_delegation` varchar(50),
	`expires_at` datetime NOT NULL,
	`created_at` datetime NOT NULL DEFAULT '2026-04-19 13:27:41.584',
	`updated_at` datetime NOT NULL DEFAULT '2026-04-19 13:27:41.584',
	CONSTRAINT `stories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `story_media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`story_id` int NOT NULL,
	`url` varchar(1000) NOT NULL,
	`type` varchar(50) NOT NULL,
	`order_index` int NOT NULL DEFAULT 0,
	CONSTRAINT `story_media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `story_stats` (
	`story_id` int NOT NULL,
	`views_count` int NOT NULL DEFAULT 0,
	`reactions_count` int NOT NULL DEFAULT 0,
	`like_count` int NOT NULL DEFAULT 0,
	`support_count` int NOT NULL DEFAULT 0,
	`appreciate_count` int NOT NULL DEFAULT 0,
	CONSTRAINT `story_stats_story_id` PRIMARY KEY(`story_id`)
);
--> statement-breakpoint
CREATE TABLE `story_reactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`story_id` int NOT NULL,
	`user_id` int NOT NULL,
	`type` varchar(50) NOT NULL,
	CONSTRAINT `story_reactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_story_reaction` UNIQUE(`story_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `story_views` (
	`story_id` int NOT NULL,
	`user_id` int NOT NULL,
	`viewed_at` datetime NOT NULL DEFAULT '2026-04-19 13:27:41.584',
	CONSTRAINT `story_views_story_id_user_id_pk` PRIMARY KEY(`story_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `guest_story_reactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`story_id` int NOT NULL,
	`guest_id` varchar(36) NOT NULL,
	`type` varchar(50) NOT NULL,
	CONSTRAINT `guest_story_reactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_guest_story_reaction` UNIQUE(`story_id`,`guest_id`)
);
--> statement-breakpoint
CREATE TABLE `guest_story_views` (
	`story_id` int NOT NULL,
	`guest_id` varchar(36) NOT NULL,
	`viewed_at` datetime NOT NULL DEFAULT '2026-04-19 13:27:41.584',
	CONSTRAINT `guest_story_views_story_id_guest_id_pk` PRIMARY KEY(`story_id`,`guest_id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-19 13:27:41.582';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-19 13:27:41.583';--> statement-breakpoint
ALTER TABLE `posts` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-19 13:27:41.584';--> statement-breakpoint
ALTER TABLE `posts` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-19 13:27:41.584';--> statement-breakpoint
ALTER TABLE `authors` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-19 13:27:41.584';--> statement-breakpoint
ALTER TABLE `authors` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-19 13:27:41.584';--> statement-breakpoint
ALTER TABLE `post_views` MODIFY COLUMN `viewed_at` datetime NOT NULL DEFAULT '2026-04-19 13:27:41.584';--> statement-breakpoint
ALTER TABLE `guest_views` MODIFY COLUMN `viewed_at` datetime NOT NULL DEFAULT '2026-04-19 13:27:41.584';--> statement-breakpoint
ALTER TABLE `tasks` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-19 13:27:41.584';--> statement-breakpoint
ALTER TABLE `tasks` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-19 13:27:41.584';--> statement-breakpoint
ALTER TABLE `announcements` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-19 13:27:41.584';--> statement-breakpoint
ALTER TABLE `announcements` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-19 13:27:41.584';--> statement-breakpoint
ALTER TABLE `event_config` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-19 13:27:41.584';