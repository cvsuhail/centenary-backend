-- Adds per-reaction-type counters to post_stats so the mobile app can render
-- each emoji's count without having to aggregate the reactions table on read.
-- Existing rows default to 0, which correctly reflects the pre-migration
-- state where only the aggregate `reactions_count` was tracked.

ALTER TABLE `post_stats`
  ADD COLUMN `like_count`       INT NOT NULL DEFAULT 0,
  ADD COLUMN `support_count`    INT NOT NULL DEFAULT 0,
  ADD COLUMN `appreciate_count` INT NOT NULL DEFAULT 0;

-- Backfill the per-type counts from the existing reactions rows so totals
-- agree with `reactions_count` right after the migration.
UPDATE `post_stats` ps
LEFT JOIN (
  SELECT post_id,
         SUM(type = 'LIKE')       AS like_count,
         SUM(type = 'SUPPORT')    AS support_count,
         SUM(type = 'APPRECIATE') AS appreciate_count
  FROM `reactions`
  GROUP BY post_id
) r ON r.post_id = ps.post_id
SET ps.like_count       = COALESCE(r.like_count,       0),
    ps.support_count    = COALESCE(r.support_count,    0),
    ps.appreciate_count = COALESCE(r.appreciate_count, 0);
