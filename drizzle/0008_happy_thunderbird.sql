ALTER TABLE `users` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-20 11:08:43.260';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-20 11:08:43.262';--> statement-breakpoint
ALTER TABLE `posts` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-20 11:08:43.262';--> statement-breakpoint
ALTER TABLE `posts` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-20 11:08:43.262';--> statement-breakpoint
ALTER TABLE `authors` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-20 11:08:43.262';--> statement-breakpoint
ALTER TABLE `authors` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-20 11:08:43.262';--> statement-breakpoint
ALTER TABLE `post_views` MODIFY COLUMN `viewed_at` datetime NOT NULL DEFAULT '2026-04-20 11:08:43.262';--> statement-breakpoint
ALTER TABLE `guest_views` MODIFY COLUMN `viewed_at` datetime NOT NULL DEFAULT '2026-04-20 11:08:43.262';--> statement-breakpoint
ALTER TABLE `tasks` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-20 11:08:43.263';--> statement-breakpoint
ALTER TABLE `tasks` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-20 11:08:43.263';--> statement-breakpoint
ALTER TABLE `task_attachments` MODIFY COLUMN `url` varchar(1000);--> statement-breakpoint
ALTER TABLE `task_completions` MODIFY COLUMN `completed_at` datetime NOT NULL DEFAULT '2026-04-20 11:08:43.263';--> statement-breakpoint
ALTER TABLE `announcements` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-20 11:08:43.263';--> statement-breakpoint
ALTER TABLE `announcements` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-20 11:08:43.263';--> statement-breakpoint
ALTER TABLE `event_config` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-20 11:08:43.263';--> statement-breakpoint
ALTER TABLE `stories` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-20 11:08:43.263';--> statement-breakpoint
ALTER TABLE `stories` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-20 11:08:43.263';--> statement-breakpoint
ALTER TABLE `story_views` MODIFY COLUMN `viewed_at` datetime NOT NULL DEFAULT '2026-04-20 11:08:43.263';--> statement-breakpoint
ALTER TABLE `guest_story_views` MODIFY COLUMN `viewed_at` datetime NOT NULL DEFAULT '2026-04-20 11:08:43.263';