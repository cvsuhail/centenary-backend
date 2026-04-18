-- Phase 1: home-feed flag, author position, and a persisted per-user
-- view set so the mobile app can render "unviewed first" across sessions
-- (Redis alone wasn't enough — its 24h TTL on view:{postId}:{userId} keys
-- meant the "already seen this" signal disappeared on day two).
--
-- All changes are additive; existing rows pick up the defaults.

ALTER TABLE `posts`
  ADD COLUMN `is_home_feed`    BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN `author_position` VARCHAR(255) NULL;

-- Hot path: "give me all posts flagged for the Home screen feed, newest
-- first" runs on every guest app-open. Narrow covering index on the flag
-- + created_at keeps that query from scanning the whole posts table.
CREATE INDEX `idx_posts_home_feed_created`
  ON `posts` (`is_home_feed`, `created_at`);

CREATE TABLE IF NOT EXISTS `post_views` (
  `post_id`   INT      NOT NULL,
  `user_id`   INT      NOT NULL,
  `viewed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`post_id`, `user_id`)
);

-- Needed for "which posts has this user viewed?" which the mobile app
-- pulls on login so it can surface unviewed posts first.
CREATE INDEX `idx_post_views_user` ON `post_views` (`user_id`);
