ALTER TABLE `users` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-19 13:44:27.681';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-19 13:44:27.682';--> statement-breakpoint
ALTER TABLE `posts` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-19 13:44:27.683';--> statement-breakpoint
ALTER TABLE `posts` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-19 13:44:27.683';--> statement-breakpoint
ALTER TABLE `authors` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-19 13:44:27.683';--> statement-breakpoint
ALTER TABLE `authors` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-19 13:44:27.683';--> statement-breakpoint
ALTER TABLE `post_views` MODIFY COLUMN `viewed_at` datetime NOT NULL DEFAULT '2026-04-19 13:44:27.683';--> statement-breakpoint
ALTER TABLE `guest_views` MODIFY COLUMN `viewed_at` datetime NOT NULL DEFAULT '2026-04-19 13:44:27.683';--> statement-breakpoint
ALTER TABLE `tasks` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-19 13:44:27.683';--> statement-breakpoint
ALTER TABLE `tasks` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-19 13:44:27.683';--> statement-breakpoint
ALTER TABLE `announcements` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-19 13:44:27.683';--> statement-breakpoint
ALTER TABLE `announcements` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-19 13:44:27.683';--> statement-breakpoint
ALTER TABLE `event_config` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-19 13:44:27.683';--> statement-breakpoint
ALTER TABLE `stories` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-19 13:44:27.683';--> statement-breakpoint
ALTER TABLE `stories` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-19 13:44:27.683';--> statement-breakpoint
ALTER TABLE `story_views` MODIFY COLUMN `viewed_at` datetime NOT NULL DEFAULT '2026-04-19 13:44:27.683';--> statement-breakpoint
ALTER TABLE `guest_story_views` MODIFY COLUMN `viewed_at` datetime NOT NULL DEFAULT '2026-04-19 13:44:27.683';--> statement-breakpoint
ALTER TABLE `stories` ADD `topic` varchar(255);