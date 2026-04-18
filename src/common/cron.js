const cron = require('node-cron');
const { eq, max } = require('drizzle-orm');
const redis = require('./redis');
const db = require('./db');
const { posts } = require('./schema');

// Phase 4 cadence: the mobile app uses the `sync:lastUpdated` key as the
// cheap "has anything changed?" probe it can poll every 5 minutes.
// Writes to the posts table already update the key inline (see
// invalidateFeedCaches in feed.controller.js), but the cron below is the
// safety net — if a write path ever forgets to refresh it, the cached
// home feed in `feed:home` never goes stale for more than 5 minutes.
const refreshHomeFeedCache = async () => {
  const [row] = await db
    .select({ value: max(posts.updatedAt) })
    .from(posts);
  const lastUpdated = row?.value ? new Date(row.value).toISOString() : new Date().toISOString();
  await redis.set('sync:lastUpdated', lastUpdated);

  // Re-prime the anonymous home-feed payload so the first guest request
  // after the cron tick hits Redis, not MySQL.
  const homePosts = await db.query.posts.findMany({
    where: eq(posts.isHomeFeed, true),
    with: { media: true, stats: true },
    orderBy: (p, { desc }) => [desc(p.isImportant), desc(p.createdAt)],
  });
  await redis.set('feed:home', JSON.stringify(homePosts), 'EX', 360);
};

const initCrons = () => {
  // EVERY 5 MIN: refresh the home-feed Redis cache + lastUpdated probe.
  // This is the mobile app's 5-minute "debounce" partner — the app polls
  // `sync:lastUpdated` and only hits /feed/home when it sees a newer
  // timestamp than the one it last stashed in Hive.
  cron.schedule('*/5 * * * *', async () => {
    try {
      await refreshHomeFeedCache();
      console.log('[CRON] Home feed cache refreshed (5m).');
    } catch (err) {
      console.error('[CRON] Error refreshing home feed cache:', err.message);
    }
  });

  // EVERY 2 MIN: Refresh priority + important posts cache
  cron.schedule('*/2 * * * *', async () => {
    try {
      const priorityPosts = await db.query.posts.findMany({
        where: eq(posts.isImportant, true),
        with: { media: true, stats: true },
        limit: 10,
        orderBy: (p, { desc }) => [desc(p.createdAt)],
      });
      await redis.set('priority:posts', JSON.stringify(priorityPosts), 'EX', 120);
      console.log('[CRON] Priority posts cache refreshed.');
    } catch (err) {
      console.error('[CRON] Error refreshing priority posts:', err.message);
    }
  });

  // Prime caches on boot so the first request after a redeploy still
  // hits Redis instead of MySQL.
  refreshHomeFeedCache().catch((err) => {
    console.error('[CRON] Boot-time home feed prime failed:', err.message);
  });
};

module.exports = initCrons;
