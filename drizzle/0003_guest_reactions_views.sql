-- Phase 4: guest identities + guest-scoped reactions/views.
--
-- The mobile app now generates a UUID the first time it launches, stashes
-- it in secure storage, and sends it as `X-Guest-Id` on every request made
-- while logged-out. The backend treats that value as a "soft user" so:
--   • guests can react to home-feed posts (one reaction per guest per
--     post, toggled exactly like a volunteer),
--   • guests get counted once per post in the view counter,
--   • none of this pollutes the `reactions` / `post_views` tables which
--     are keyed by `users.id` (an INT) and can't hold UUIDs.
--
-- Guest rows are NEVER merged into `reactions` / `post_views` on signup.
-- If a guest later logs in as a volunteer we'd rather the two identities
-- reconcile via the newly created volunteer (blank slate) than silently
-- double-count — the counters on `post_stats` already reflect both tables.

CREATE TABLE IF NOT EXISTS `guest_reactions` (
  `post_id`    INT           NOT NULL,
  `guest_id`   VARCHAR(64)   NOT NULL,
  `type`       VARCHAR(50)   NOT NULL,
  `created_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`post_id`, `guest_id`)
);

-- Mirror of `post_views` for the guest side. Same (postId, guestId)
-- composite PK means repeat POST /feed/view from the same guest is a
-- no-op at the DB level.
CREATE TABLE IF NOT EXISTS `guest_views` (
  `post_id`   INT          NOT NULL,
  `guest_id`  VARCHAR(64)  NOT NULL,
  `viewed_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`post_id`, `guest_id`)
);
