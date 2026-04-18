ALTER TABLE `users` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-18 12:16:22.996';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-18 12:16:22.997';--> statement-breakpoint
ALTER TABLE `posts` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-18 12:16:22.997';--> statement-breakpoint
ALTER TABLE `posts` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-18 12:16:22.997';--> statement-breakpoint
ALTER TABLE `authors` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-18 12:16:22.997';--> statement-breakpoint
ALTER TABLE `authors` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-18 12:16:22.997';--> statement-breakpoint
ALTER TABLE `post_views` MODIFY COLUMN `viewed_at` datetime NOT NULL DEFAULT '2026-04-18 12:16:22.997';--> statement-breakpoint
ALTER TABLE `guest_views` MODIFY COLUMN `viewed_at` datetime NOT NULL DEFAULT '2026-04-18 12:16:22.998';--> statement-breakpoint
ALTER TABLE `tasks` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-18 12:16:22.998';--> statement-breakpoint
ALTER TABLE `tasks` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-18 12:16:22.998';--> statement-breakpoint
ALTER TABLE `announcements` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT '2026-04-18 12:16:22.998';--> statement-breakpoint
ALTER TABLE `announcements` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-18 12:16:22.998';--> statement-breakpoint
ALTER TABLE `event_config` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT '2026-04-18 12:16:22.998';