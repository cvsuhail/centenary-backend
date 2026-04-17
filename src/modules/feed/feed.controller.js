const { eq, and, or, gt, sql } = require('drizzle-orm');
const db = require('../../common/db');
const { posts, postMedia, postStats, reactions } = require('../../common/schema');
const redis = require('../../common/redis');
const { success, error } = require('../../common/response');

const getFeed = async (req, res) => {
  const { delegate } = req.query;
  const cacheKey = `feed:delegation:${delegate || 'all'}`;

  // 1. Try Redis cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return success(res, JSON.parse(cached), 'Feed fetched from cache');
  }

  // 2. Fetch from DB with relations
  const feedPosts = await db.query.posts.findMany({
    where: delegate
      ? or(eq(posts.delegation, delegate), eq(posts.delegation, 'ALL'))
      : undefined,
    with: { media: true, stats: true },
    orderBy: (posts, { desc }) => [desc(posts.isImportant), desc(posts.createdAt)],
  });

  // 3. Cache (60s TTL)
  await redis.set(cacheKey, JSON.stringify(feedPosts), 'EX', 60);

  return success(res, feedPosts, 'Feed fetched from database');
};

const createPost = async (req, res) => {
  const { title, description, mediaType, mediaLayout, authorName, authorDp, delegation, isImportant, media } = req.body;

  try {
    let newPostId;

    await db.transaction(async (tx) => {
      // 1. Insert post
      const [result] = await tx.insert(posts).values({
        title,
        description,
        mediaType,
        mediaLayout,
        authorName,
        authorDp,
        delegation,
        isImportant: isImportant || false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      newPostId = result.insertId;

      // 2. Insert media
      if (media && media.length > 0) {
        await tx.insert(postMedia).values(
          media.map((m, index) => ({
            postId: newPostId,
            url: m.url,
            type: m.type,
            orderIndex: index,
          }))
        );
      }

      // 3. Initialize stats
      await tx.insert(postStats).values({
        postId: newPostId,
        viewsCount: 0,
        reactionsCount: 0,
        shareCount: 0,
      });
    });

    // 4. Invalidate caches
    await redis.del('feed:delegation:all');
    if (delegation) await redis.del(`feed:delegation:${delegation}`);
    await redis.set('sync:lastUpdated', new Date().toISOString());

    return success(res, { id: newPostId }, 'Post created successfully', 201);
  } catch (err) {
    return error(res, 'Failed to create post', 500, err.message);
  }
};

const reactToPost = async (req, res) => {
  const { postId, type } = req.body;
  const userId = req.user.id;

  try {
    const [existing] = await db.select()
      .from(reactions)
      .where(and(eq(reactions.postId, postId), eq(reactions.userId, userId)));

    if (existing) {
      await db.delete(reactions).where(eq(reactions.id, existing.id));
      await db.update(postStats)
        .set({ reactionsCount: sql`${postStats.reactionsCount} - 1` })
        .where(eq(postStats.postId, postId));
    } else {
      await db.insert(reactions).values({ postId, userId, type });
      await db.update(postStats)
        .set({ reactionsCount: sql`${postStats.reactionsCount} + 1` })
        .where(eq(postStats.postId, postId));
    }

    await redis.del('feed:delegation:all');
    return success(res, null, 'Reaction updated');
  } catch (err) {
    return error(res, 'Failed to react', 500, err.message);
  }
};

const viewPost = async (req, res) => {
  const { postId } = req.body;
  const userId = req.user.id;
  const viewKey = `view:${postId}:${userId}`;

  const hasViewed = await redis.get(viewKey);
  if (!hasViewed) {
    await redis.set(viewKey, '1', 'EX', 86400);
    await db.update(postStats)
      .set({ viewsCount: sql`${postStats.viewsCount} + 1` })
      .where(eq(postStats.postId, postId));
  }

  return success(res, null, 'View recorded');
};

const sharePost = async (req, res) => {
  const { postId } = req.body;

  await db.update(postStats)
    .set({ shareCount: sql`${postStats.shareCount} + 1` })
    .where(eq(postStats.postId, postId));

  return success(res, null, 'Share recorded');
};

const deletePost = async (req, res) => {
  const { postId } = req.params;

  try {
    // Check if post exists
    const [existingPost] = await db.select().from(posts).where(eq(posts.id, postId));
    if (!existingPost) {
      return error(res, 'Post not found', 404);
    }

    // Delete post and related data in a transaction
    await db.transaction(async (tx) => {
      // Delete post media
      await tx.delete(postMedia).where(eq(postMedia.postId, postId));
      
      // Delete post stats
      await tx.delete(postStats).where(eq(postStats.postId, postId));
      
      // Delete post reactions
      await tx.delete(reactions).where(eq(reactions.postId, postId));
      
      // Delete the post itself
      await tx.delete(posts).where(eq(posts.id, postId));
    });

    // Invalidate all feed caches
    await redis.del('feed:delegation:all');
    await redis.del('feed:delegation:SSF');
    await redis.del('feed:delegation:SYS');
    await redis.del('feed:delegation:KMJ');
    await redis.del('feed:delegation:RSC');
    await redis.set('sync:lastUpdated', new Date().toISOString());

    console.log(`[Feed][delete-post] Post ${postId} deleted successfully`);
    return success(res, null, 'Post deleted successfully');
  } catch (err) {
    console.error('[Feed][delete-post] Error:', err);
    return error(res, 'Failed to delete post', 500, err.message);
  }
};

const getStats = async (req, res) => {
  try {
    const [stats] = await db.select({
      totalPosts: sql`count(*)`,
      totalViews: sql`sum(${postStats.viewsCount})`,
      totalReactions: sql`sum(${postStats.reactionsCount})`,
      totalShares: sql`sum(${postStats.shareCount})`,
    }).from(posts)
    .innerJoin(postStats, eq(posts.id, postStats.postId));

    const totalUsersResult = await db.select({ count: sql`count(*)` }).from(require('../../common/schema').users);
    
    return success(res, {
      totalPosts: parseInt(stats.totalPosts) || 0,
      totalViews: parseInt(stats.totalViews) || 0,
      totalReactions: parseInt(stats.totalReactions) || 0,
      totalShares: parseInt(stats.totalShares) || 0,
      totalUsers: parseInt(totalUsersResult[0].count) || 0,
    }, 'Stats fetched successfully');
  } catch (err) {
    return error(res, 'Failed to fetch stats', 500, err.message);
  }
};

module.exports = { getFeed, createPost, reactToPost, viewPost, sharePost, deletePost, getStats };
