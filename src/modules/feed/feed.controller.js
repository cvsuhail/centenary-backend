const { eq, and, sql, inArray, or, gt, max } = require('drizzle-orm');
const db = require('../../common/db');
const { posts, postMedia, postStats, reactions, postViews } = require('../../common/schema');
const redis = require('../../common/redis');
const { success, error } = require('../../common/response');

// ─── REACTIONS ──────────────────────────────────────────────────────────────
// The mobile app exposes three reactions. Keep the allowed list in one place
// so the column mapping is trivial and invalid payloads are rejected early.
const REACTION_TYPES = ['LIKE', 'SUPPORT', 'APPRECIATE'];
const REACTION_TO_FIELD = {
  LIKE: 'likeCount',
  SUPPORT: 'supportCount',
  APPRECIATE: 'appreciateCount',
};

const DELEGATIONS = ['all', 'SSF', 'SYS', 'SKSSF', 'KMJ', 'RSC'];

// Bumps `posts.updatedAt` so the client-side lastSyncedAt / If-Modified-Since
// flow knows the row has new counters to pull. We use NOW() to avoid clock
// skew between the app server and whatever DB node we're talking to.
const bumpPostUpdatedAt = async (postId, txOrDb = db) => {
  if (!postId) return;
  await txOrDb
    .update(posts)
    .set({ updatedAt: sql`NOW()` })
    .where(eq(posts.id, postId));
};

// Caches we bust on any write. `feed:delegation:*` powers the main Feed tab,
// `feed:home` powers the new public home-screen feed, and the important
// rail has its own delegation-scoped key set.
const invalidateFeedCaches = async () => {
  await Promise.all([
    ...DELEGATIONS.map((d) => redis.del(`feed:delegation:${d}`)),
    ...DELEGATIONS.map((d) => redis.del(`feed:important:${d}`)),
    redis.del('feed:home'),
  ]);
  await redis.set('sync:lastUpdated', new Date().toISOString());
};

// Computes the max posts.updatedAt across the requested scope so clients can
// use it as the next `since` cursor and so we can reply with 'not modified'
// when nothing is newer.
const maxFeedUpdatedAt = async (delegate) => {
  const [row] = await db
    .select({ value: max(posts.updatedAt) })
    .from(posts)
    .where(
      delegate
        ? or(eq(posts.delegation, delegate), eq(posts.delegation, 'ALL'))
        : undefined,
    );
  return row?.value || null;
};

const parseSince = (raw) => {
  if (!raw) return null;
  const dt = new Date(raw);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

// Merge the authenticated user's own reactions (if any) onto a list of posts
// so the client can highlight the active reaction without a separate request.
const attachMyReactions = async (feedPosts, userId) => {
  if (!userId || feedPosts.length === 0) return feedPosts;
  const ids = feedPosts.map((p) => p.id);
  const rows = await db
    .select({ postId: reactions.postId, type: reactions.type })
    .from(reactions)
    .where(and(eq(reactions.userId, userId), inArray(reactions.postId, ids)));
  const byPost = new Map(rows.map((r) => [r.postId, r.type]));
  return feedPosts.map((p) => ({ ...p, myReaction: byPost.get(p.id) || null }));
};

// Mirror of attachMyReactions for the persisted views set. Lets the mobile
// app sort unviewed posts to the top on first render without having to
// reconcile a local-only set against the server.
const attachMyViews = async (feedPosts, userId) => {
  if (!userId || feedPosts.length === 0) return feedPosts;
  const ids = feedPosts.map((p) => p.id);
  const rows = await db
    .select({ postId: postViews.postId })
    .from(postViews)
    .where(and(eq(postViews.userId, userId), inArray(postViews.postId, ids)));
  const seen = new Set(rows.map((r) => r.postId));
  return feedPosts.map((p) => ({ ...p, viewedByMe: seen.has(p.id) }));
};

// Response envelope for the feed. Always carries a `lastUpdated` so the
// mobile app can stash it in Hive and send it back on the next request to
// avoid re-downloading unchanged data.
const buildFeedEnvelope = (items, lastUpdated, notModified = false) => ({
  items,
  lastUpdated: lastUpdated ? new Date(lastUpdated).toISOString() : null,
  notModified,
});

// Main feed tab filter: every post EXCEPT ones that are marked home-feed-
// only (home-feed + not important). Keeps Home–exclusive content out of
// the main Feed tab while still letting admins flag something important on
// both surfaces by flipping both flags.
//
// When `includeHomeOnly` is true (i.e. the caller is an admin) we drop the
// home-only exclusion entirely so the admin panel — which uses this same
// endpoint to list every post — can see home-feed-only rows too.
const mainFeedScope = (delegate, { includeHomeOnly = false } = {}) => {
  const delegationClause = delegate
    ? or(eq(posts.delegation, delegate), eq(posts.delegation, 'ALL'))
    : undefined;
  if (includeHomeOnly) return delegationClause;
  const notHomeOnly = or(eq(posts.isHomeFeed, false), eq(posts.isImportant, true));
  return delegationClause ? and(delegationClause, notHomeOnly) : notHomeOnly;
};

const getFeed = async (req, res) => {
  const { delegate } = req.query;
  const since = parseSince(req.query.since);
  const userId = req.user ? req.user.id : null;
  const isAdmin = req.user && req.user.role === 'admin';

  // Guard: the main feed is volunteer-only. Guests should hit /feed/home
  // or /feed/important (both public).
  if (!userId) return error(res, 'Authentication required', 401);

  // Short-circuit: if the caller already has data at-or-after the max
  // updatedAt in scope, don't touch the DB query at all. This is the hot
  // path for idle mobile clients checking in. Admins skip this — their
  // dashboards need an authoritative listing every time.
  const lastUpdatedAt = await maxFeedUpdatedAt(delegate);
  if (!isAdmin && since && lastUpdatedAt && since >= lastUpdatedAt) {
    return success(
      res,
      buildFeedEnvelope([], lastUpdatedAt, true),
      'Feed not modified',
    );
  }

  const feedPosts = await db.query.posts.findMany({
    where: mainFeedScope(delegate, { includeHomeOnly: isAdmin }),
    with: { media: true, stats: true },
    orderBy: (posts, { desc }) => [desc(posts.isImportant), desc(posts.createdAt)],
  });

  const withReactions = await attachMyReactions(feedPosts, userId);
  const personalized = await attachMyViews(withReactions, userId);
  return success(
    res,
    buildFeedEnvelope(personalized, lastUpdatedAt, false),
    'Feed fetched from database',
  );
};

// Public home-screen feed. Serves posts flagged `isHomeFeed` ordered with
// important first so admins who also toggle `isImportant` get the usual
// "pinned at top" behaviour. No auth required — this is the first thing a
// guest user sees on app open.
const getHomeFeed = async (req, res) => {
  const userId = req.user ? req.user.id : null;
  const cacheKey = 'feed:home';

  if (!userId) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      return success(res, { items: parsed }, 'Home feed fetched from cache');
    }
  }

  const feedPosts = await db.query.posts.findMany({
    where: eq(posts.isHomeFeed, true),
    with: { media: true, stats: true },
    orderBy: (posts, { desc }) => [desc(posts.isImportant), desc(posts.createdAt)],
  });

  if (!userId) {
    await redis.set(cacheKey, JSON.stringify(feedPosts), 'EX', 60);
    return success(res, { items: feedPosts }, 'Home feed fetched');
  }

  const withReactions = await attachMyReactions(feedPosts, userId);
  const personalized = await attachMyViews(withReactions, userId);
  return success(res, { items: personalized }, 'Home feed fetched');
};

// Returns the pinned / important posts — sorted newest-first — so the
// mobile Home tab can render the "Important feeds" rail without pulling
// the full feed and filtering client-side. Accepts an optional ?limit so
// we don't over-fetch on slow networks.
const getImportantFeed = async (req, res) => {
  const { delegate } = req.query;
  const userId = req.user ? req.user.id : null;
  const rawLimit = parseInt(req.query.limit, 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 && rawLimit <= 50 ? rawLimit : 10;

  const feedPosts = await db.query.posts.findMany({
    where: delegate
      ? and(
          eq(posts.isImportant, true),
          or(eq(posts.delegation, delegate), eq(posts.delegation, 'ALL'))
        )
      : eq(posts.isImportant, true),
    with: { media: true, stats: true },
    orderBy: (posts, { desc }) => [desc(posts.createdAt)],
    limit,
  });

  const withReactions = await attachMyReactions(feedPosts, userId);
  const items = await attachMyViews(withReactions, userId);
  return success(res, { items }, 'Important feed fetched successfully');
};

const getPostById = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user ? req.user.id : null;

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    with: { media: true, stats: true },
  });

  if (!post) return error(res, 'Post not found', 404);

  const [withReactions] = await attachMyReactions([post], userId);
  const [personalized] = await attachMyViews([withReactions], userId);
  return success(res, personalized, 'Post fetched successfully');
};

const createPost = async (req, res) => {
  const {
    title,
    description,
    mediaType,
    mediaLayout,
    authorName,
    authorPosition,
    authorDp,
    delegation,
    isImportant,
    isHomeFeed,
    media,
  } = req.body;

  // Author identity is required so every post can surface a byline in the
  // mobile feed card (name + role + avatar).
  if (!authorName || !String(authorName).trim()) {
    return error(res, 'authorName is required', 400);
  }
  if (!authorPosition || !String(authorPosition).trim()) {
    return error(res, 'authorPosition is required', 400);
  }

  try {
    let newPostId;

    await db.transaction(async (tx) => {
      const [result] = await tx.insert(posts).values({
        title,
        description,
        mediaType,
        mediaLayout,
        authorName,
        authorPosition,
        authorDp,
        delegation,
        isImportant: isImportant || false,
        isHomeFeed: isHomeFeed || false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      newPostId = result.insertId;

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

      await tx.insert(postStats).values({
        postId: newPostId,
        viewsCount: 0,
        reactionsCount: 0,
        likeCount: 0,
        supportCount: 0,
        appreciateCount: 0,
        shareCount: 0,
      });
    });

    await invalidateFeedCaches();
    return success(res, { id: newPostId }, 'Post created successfully', 201);
  } catch (err) {
    return error(res, 'Failed to create post', 500, err.message);
  }
};

// reactToPost implements the "only one reaction per user per post" rule:
//  • no existing reaction   → insert + bump total + bump per-type counter.
//  • same type as before    → delete + decrement total + decrement per-type.
//  • different type         → update the row in place, decrement old per-type,
//                              increment new per-type (total unchanged).
const reactToPost = async (req, res) => {
  const { postId, type } = req.body;
  const userId = req.user.id;

  if (!postId) return error(res, 'postId is required', 400);
  if (!REACTION_TYPES.includes(type)) {
    return error(res, `type must be one of ${REACTION_TYPES.join(', ')}`, 400);
  }

  try {
    const nextField = REACTION_TO_FIELD[type];
    const nextColumn = postStats[nextField];
    let activeReaction = type;

    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(reactions)
        .where(and(eq(reactions.postId, postId), eq(reactions.userId, userId)));

      if (!existing) {
        await tx.insert(reactions).values({ postId, userId, type });
        await tx.update(postStats)
          .set({
            reactionsCount: sql`${postStats.reactionsCount} + 1`,
            [nextField]: sql`${nextColumn} + 1`,
          })
          .where(eq(postStats.postId, postId));
        return;
      }

      if (existing.type === type) {
        // Toggling off — remove the row and undo the counters.
        await tx.delete(reactions).where(eq(reactions.id, existing.id));
        await tx.update(postStats)
          .set({
            reactionsCount: sql`GREATEST(${postStats.reactionsCount} - 1, 0)`,
            [nextField]: sql`GREATEST(${nextColumn} - 1, 0)`,
          })
          .where(eq(postStats.postId, postId));
        activeReaction = null;
        return;
      }

      // Switching from one reaction to another — total stays the same.
      const prevField = REACTION_TO_FIELD[existing.type];
      await tx.update(reactions)
        .set({ type })
        .where(eq(reactions.id, existing.id));

      const updates = { [nextField]: sql`${nextColumn} + 1` };
      if (prevField) {
        const prevColumn = postStats[prevField];
        updates[prevField] = sql`GREATEST(${prevColumn} - 1, 0)`;
      }
      await tx.update(postStats).set(updates).where(eq(postStats.postId, postId));
      await bumpPostUpdatedAt(postId, tx);
    });

    await invalidateFeedCaches();
    return success(res, { myReaction: activeReaction }, 'Reaction updated');
  } catch (err) {
    return error(res, 'Failed to react', 500, err.message);
  }
};

// Unique views, tracked in MySQL so the "viewed by me" signal survives
// beyond Redis TTL. We also keep a short-lived Redis key as a cheap
// de-dupe in front of the insert for the hot path where a user scrolls
// the same post past the view trigger twice in quick succession.
const viewPost = async (req, res) => {
  const { postId } = req.body;
  const userId = req.user.id;
  if (!postId) return error(res, 'postId is required', 400);

  const viewKey = `view:${postId}:${userId}`;
  const cached = await redis.get(viewKey);
  if (cached) return success(res, null, 'View already recorded');

  // Best-effort Redis reservation; a race where two requests both miss is
  // fine because the MySQL INSERT IGNORE below is the real gatekeeper.
  await redis.set(viewKey, '1', 'EX', 86400);

  let inserted = false;
  try {
    const [result] = await db.insert(postViews).values({
      postId: Number(postId),
      userId: Number(userId),
      viewedAt: new Date(),
    }).onDuplicateKeyUpdate({ set: { userId: Number(userId) } });
    // `affectedRows` is 1 for a real insert and 2 for a row that was
    // updated via ON DUPLICATE KEY; anything other than 1 means the row
    // already existed (MySQL quirk) so we don't double-count.
    inserted = result && result.affectedRows === 1;
  } catch (err) {
    console.error('[Feed][view-post] Failed to record view', err);
  }

  if (inserted) {
    await db.update(postStats)
      .set({ viewsCount: sql`${postStats.viewsCount} + 1` })
      .where(eq(postStats.postId, postId));
    await bumpPostUpdatedAt(postId);
    await invalidateFeedCaches();
  }

  return success(res, null, 'View recorded');
};

const sharePost = async (req, res) => {
  const { postId } = req.body;
  if (!postId) return error(res, 'postId is required', 400);

  await db.update(postStats)
    .set({ shareCount: sql`${postStats.shareCount} + 1` })
    .where(eq(postStats.postId, postId));

  await bumpPostUpdatedAt(postId);
  await invalidateFeedCaches();
  return success(res, null, 'Share recorded');
};

// Updates the editable fields of a post and (optionally) its media list.
// When `media` is provided we replace the entire set — this keeps the admin
// UI simple (edit means "here is the new state") at the cost of one delete
// + insert per save. Counters in post_stats are never touched here.
const updatePost = async (req, res) => {
  const { postId } = req.params;
  const {
    title,
    description,
    mediaType,
    mediaLayout,
    authorName,
    authorPosition,
    authorDp,
    delegation,
    isImportant,
    isHomeFeed,
    media,
  } = req.body;

  if (!postId) return error(res, 'postId is required', 400);

  try {
    const [existing] = await db.select().from(posts).where(eq(posts.id, postId));
    if (!existing) return error(res, 'Post not found', 404);

    const updates = { updatedAt: sql`NOW()` };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (mediaType !== undefined) updates.mediaType = mediaType;
    if (mediaLayout !== undefined) updates.mediaLayout = mediaLayout;
    if (authorName !== undefined) updates.authorName = authorName;
    if (authorPosition !== undefined) updates.authorPosition = authorPosition;
    if (authorDp !== undefined) updates.authorDp = authorDp;
    if (delegation !== undefined) updates.delegation = delegation;
    if (isImportant !== undefined) updates.isImportant = Boolean(isImportant);
    if (isHomeFeed !== undefined) updates.isHomeFeed = Boolean(isHomeFeed);

    await db.transaction(async (tx) => {
      await tx.update(posts).set(updates).where(eq(posts.id, postId));

      if (Array.isArray(media)) {
        await tx.delete(postMedia).where(eq(postMedia.postId, postId));
        if (media.length > 0) {
          await tx.insert(postMedia).values(
            media.map((m, index) => ({
              postId: Number(postId),
              url: m.url,
              type: m.type,
              orderIndex: index,
            })),
          );
        }
      }
    });

    await invalidateFeedCaches();

    const fresh = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
      with: { media: true, stats: true },
    });
    return success(res, fresh, 'Post updated successfully');
  } catch (err) {
    console.error('[Feed][update-post] Error:', err);
    return error(res, 'Failed to update post', 500, err.message);
  }
};

const deletePost = async (req, res) => {
  const { postId } = req.params;

  try {
    const [existingPost] = await db.select().from(posts).where(eq(posts.id, postId));
    if (!existingPost) {
      return error(res, 'Post not found', 404);
    }

    await db.transaction(async (tx) => {
      await tx.delete(postMedia).where(eq(postMedia.postId, postId));
      await tx.delete(postStats).where(eq(postStats.postId, postId));
      await tx.delete(reactions).where(eq(reactions.postId, postId));
      await tx.delete(postViews).where(eq(postViews.postId, postId));
      await tx.delete(posts).where(eq(posts.id, postId));
    });

    await invalidateFeedCaches();
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

module.exports = {
  getFeed,
  getHomeFeed,
  getImportantFeed,
  getPostById,
  createPost,
  updatePost,
  reactToPost,
  viewPost,
  sharePost,
  deletePost,
  getStats,
};
