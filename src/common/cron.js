const cron = require('node-cron');
const { eq } = require('drizzle-orm');
const redis = require('./redis');
const db = require('./db');
const { posts } = require('./schema');

const initCrons = () => {
  // EVERY 5 MIN: Placeholder for batch Redis stats → MySQL sync
  cron.schedule('*/5 * * * *', () => {
    console.log('[CRON] Sync Redis stats to MySQL (placeholder)');
  });

  // EVERY 2 MIN: Refresh priority + important posts cache
  cron.schedule('*/2 * * * *', async () => {
    console.log('[CRON] Refreshing priority posts cache...');
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
};

module.exports = initCrons;
