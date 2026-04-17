const { gt } = require('drizzle-orm');
const db = require('../../common/db');
const { posts, postMedia, postStats, tasks } = require('../../common/schema');
const redis = require('../../common/redis');
const { success, error } = require('../../common/response');

const syncData = async (req, res) => {
  const { lastSync } = req.body;

  if (!lastSync) return error(res, 'lastSync timestamp is required', 400);

  try {
    const lastSyncDate = new Date(lastSync);

    // Fast path: check Redis flag
    const redisSyncTime = await redis.get('sync:lastUpdated');
    if (redisSyncTime && new Date(lastSync) >= new Date(redisSyncTime)) {
      return success(res, { updated: false }, 'No new updates');
    }

    // Fetch delta posts
    const updatedPosts = await db.query.posts.findMany({
      where: gt(posts.updatedAt, lastSyncDate),
      with: { media: true, stats: true },
    });

    // Fetch delta tasks
    const updatedTasks = await db.select().from(tasks).where(gt(tasks.updatedAt, lastSyncDate));

    const newSyncTime = new Date().toISOString();

    return success(res, {
      updated: true,
      syncTime: newSyncTime,
      data: { posts: updatedPosts, tasks: updatedTasks },
    }, 'Data synced successfully');
  } catch (err) {
    return error(res, 'Failed to sync data', 500, err.message);
  }
};

module.exports = { syncData };
