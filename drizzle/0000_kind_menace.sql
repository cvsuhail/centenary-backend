CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`delegate` varchar(50),
	`name` varchar(255),
	`dob` datetime,
	`entity_details` json,
	`created_at` datetime NOT NULL DEFAULT '2026-04-17 20:47:04.650',
	`updated_at` datetime NOT NULL DEFAULT '2026-04-17 20:47:04.650',
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`media_type` varchar(50),
	`media_layout` varchar(50),
	`author_name` varchar(255),
	`author_dp` varchar(1000),
	`delegation` varchar(100),
	`is_important` boolean NOT NULL DEFAULT false,
	`priority_start` datetime,
	`priority_end` datetime,
	`created_at` datetime NOT NULL DEFAULT '2026-04-17 20:47:04.651',
	`updated_at` datetime NOT NULL DEFAULT '2026-04-17 20:47:04.651',
	CONSTRAINT `posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `post_media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`post_id` int NOT NULL,
	`url` varchar(1000) NOT NULL,
	`type` varchar(50) NOT NULL,
	`order_index` int NOT NULL DEFAULT 0,
	CONSTRAINT `post_media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `post_stats` (
	`post_id` int NOT NULL,
	`views_count` int NOT NULL DEFAULT 0,
	`reactions_count` int NOT NULL DEFAULT 0,
	`like_count` int NOT NULL DEFAULT 0,
	`support_count` int NOT NULL DEFAULT 0,
	`appreciate_count` int NOT NULL DEFAULT 0,
	`share_count` int NOT NULL DEFAULT 0,
	CONSTRAINT `post_stats_post_id` PRIMARY KEY(`post_id`)
);
--> statement-breakpoint
CREATE TABLE `reactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`post_id` int NOT NULL,
	`user_id` int NOT NULL,
	`type` varchar(50) NOT NULL,
	CONSTRAINT `reactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_reaction` UNIQUE(`post_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`status` varchar(50) NOT NULL DEFAULT 'PENDING',
	`created_at` datetime NOT NULL DEFAULT '2026-04-17 20:47:04.651',
	`updated_at` datetime NOT NULL DEFAULT '2026-04-17 20:47:04.651',
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
