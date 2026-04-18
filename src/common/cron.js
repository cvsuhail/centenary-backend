const cron = require('node-cron');
const { eq, and, or } = require('drizzle-orm');
const redis = require('./redis');
const db = require('./db');
const { posts } = require('./schema');

// Delegations for cache refresh
const DELEGATIONS = ['all', 'SSF', 'SYS', 'SKSSF', 'KMJ', 'RSC'];

const initCrons = () => {
  // EVERY 5 MIN: Refresh home feed cache and update lastUpdated timestamp
  cron.schedule('*/5 * * * *', async () => {
    console.log('[CRON] Refreshing home feed cache...');
    try {
      const homeFeedPosts = await db.query.posts.findMany({
        where: eq(posts.isHomeFeed, true),
        with: { media: true, stats: true },
        orderBy: (p, { desc }) => [desc(p.isImportant), desc(p.createdAt)],
      });
      await redis.set('feed:home', JSON.stringify(homeFeedPosts), 'EX', 300);
      await redis.set('sync:lastUpdated', new Date().toISOString());
      console.log('[CRON] Home feed cache refreshed.');
    } catch (err) {
      console.error('[CRON] Error refreshing home feed:', err.message);
    }
  });

  // EVERY 5 MIN: Refresh important feeds cache for all delegations
  cron.schedule('*/5 * * * *', async () => {
    console.log('[CRON] Refreshing important feeds cache...');
    try {
      for (const delegation of DELEGATIONS) {
        const importantPosts = await db.query.posts.findMany({
          where: and(
            eq(posts.isImportant, true),
            or(eq(posts.delegation, delegation), eq(posts.delegation, 'ALL'))
          ),
          with: { media: true, stats: true },
          limit: 10,
          orderBy: (p, { desc }) => [desc(p.createdAt)],
        });
        await redis.set(`feed:important:${delegation}`, JSON.stringify(importantPosts), 'EX', 300);
      }
      console.log('[CRON] Important feeds cache refreshed.');
    } catch (err) {
      console.error('[CRON] Error refreshing important feeds:', err.message);
    }
  });

  // EVERY 5 MIN: Refresh delegation feeds cache
  cron.schedule('*/5 * * * *', async () => {
    console.log('[CRON] Refreshing delegation feeds cache...');
    try {
      for (const delegation of DELEGATIONS) {
        const delegationPosts = await db.query.posts.findMany({
          where: and(
            or(eq(posts.delegation, delegation), eq(posts.delegation, 'ALL')),
            or(eq(posts.isHomeFeed, false), eq(posts.isImportant, true))
          ),
          with: { media: true, stats: true },
          orderBy: (p, { desc }) => [desc(p.isImportant), desc(p.createdAt)],
        });
        await redis.set(`feed:delegation:${delegation}`, JSON.stringify(delegationPosts), 'EX', 300);
      }
      console.log('[CRON] Delegation feeds cache refreshed.');
    } catch (err) {
      console.error('[CRON] Error refreshing delegation feeds:', err.message);
    }
  });
};

module.exports = initCrons;
