const { eq, and, sql, inArray, or, gt, lt, desc } = require('drizzle-orm');
const db = require('../../common/db');
const { stories, storyMedia, storyStats, storyReactions, storyViews, guestStoryReactions, guestStoryViews, authors } = require('../../common/schema');
const redis = require('../../common/redis');
const { success, error } = require('../../common/response');
const { upsertAuthor } = require('../author/author.controller');

// ─── REACTIONS ──────────────────────────────────────────────────────────────
const REACTION_TYPES = ['LIKE', 'SUPPORT', 'APPRECIATE'];
const REACTION_TO_FIELD = {
  LIKE: 'likeCount',
  SUPPORT: 'supportCount',
  APPRECIATE: 'appreciateCount',
};

const DELEGATIONS = ['all', 'SSF', 'SYS', 'SKSSF', 'KMJ', 'RSC'];

// Bumps `stories.updatedAt` so the client-side lastSyncedAt / If-Modified-Since
// flow knows the row has new counters to pull.
const bumpStoryUpdatedAt = async (storyId, txOrDb = db) => {
  if (!storyId) return;
  await txOrDb
    .update(stories)
    .set({ updatedAt: sql`NOW()` })
    .where(eq(stories.id, storyId));
};

// Invalidates story caches
const invalidateStoryCaches = async () => {
  await Promise.all([
    ...DELEGATIONS.map((d) => redis.del(`stories:delegation:${d}`)),
    redis.del('stories:guest'),
    redis.del('stories:all'),
  ]);
  await redis.set('sync:lastUpdated', new Date().toISOString());
};

// Merge the authenticated user's own reactions onto a list of stories
const attachMyStoryReactions = async (storyItems, userId) => {
  if (!userId || storyItems.length === 0) return storyItems;
  const ids = storyItems.map((s) => s.id);
  const rows = await db
    .select({ storyId: storyReactions.storyId, type: storyReactions.type })
    .from(storyReactions)
    .where(and(eq(storyReactions.userId, userId), inArray(storyReactions.storyId, ids)));
  const byStory = new Map(rows.map((r) => [r.storyId, r.type]));
  return storyItems.map((s) => ({ ...s, myReaction: byStory.get(s.id) || null }));
};

// Merge the guest user's own reactions onto a list of stories
const attachGuestStoryReactions = async (storyItems, guestId) => {
  if (!guestId || storyItems.length === 0) return storyItems;
  const ids = storyItems.map((s) => s.id);
  const rows = await db
    .select({ storyId: guestStoryReactions.storyId, type: guestStoryReactions.type })
    .from(guestStoryReactions)
    .where(and(eq(guestStoryReactions.guestId, guestId), inArray(guestStoryReactions.storyId, ids)));
  const byStory = new Map(rows.map((r) => [r.storyId, r.type]));
  return storyItems.map((s) => ({ ...s, myReaction: byStory.get(s.id) || null }));
};

// Merge the authenticated user's own views onto a list of stories
const attachMyStoryViews = async (storyItems, userId) => {
  if (!userId || storyItems.length === 0) return storyItems;
  const ids = storyItems.map((s) => s.id);
  const rows = await db
    .select({ storyId: storyViews.storyId })
    .from(storyViews)
    .where(and(eq(storyViews.userId, userId), inArray(storyViews.storyId, ids)));
  const seen = new Set(rows.map((r) => r.storyId));
  return storyItems.map((s) => ({ ...s, viewedByMe: seen.has(s.id) }));
};

// Merge the guest user's own views onto a list of stories
const attachGuestStoryViews = async (storyItems, guestId) => {
  if (!guestId || storyItems.length === 0) return storyItems;
  const ids = storyItems.map((s) => s.id);
  const rows = await db
    .select({ storyId: guestStoryViews.storyId })
    .from(guestStoryViews)
    .where(and(eq(guestStoryViews.guestId, guestId), inArray(guestStoryViews.storyId, ids)));
  const seen = new Set(rows.map((r) => r.storyId));
  return storyItems.map((s) => ({ ...s, viewedByMe: seen.has(s.id) }));
};

// Build visibility clause based on user type and delegation
const buildStoryVisibilityClause = (userId, guestId, delegate) => {
  const now = new Date();
  
  // Stories must not be expired
  const notExpired = gt(stories.expiresAt, now);
  
  // Build visibility conditions
  const conditions = [];
  
  if (guestId && !userId) {
    // Guest user - can see stories visible to guests
    conditions.push(and(eq(stories.visibleToGuests, true), notExpired));
  } else if (userId) {
    // Authenticated delegate - can see stories visible to delegates
    const delegateVisibility = eq(stories.visibleToDelegates, true);
    
    if (delegate && delegate !== 'all') {
      // Filter by special delegation if specified
      const specialDelegationMatch = or(
        eq(stories.specialDelegation, delegate),
        eq(stories.specialDelegation, null), // null means all delegates
        eq(stories.specialDelegation, 'all')
      );
      conditions.push(and(delegateVisibility, specialDelegationMatch, notExpired));
    } else {
      // No delegation filter - show all delegate-visible stories
      conditions.push(and(delegateVisibility, notExpired));
    }
  }
  
  return or(...conditions);
};

// Get stories for mobile app (Instagram-style feed)
const getStories = async (req, res) => {
  const userId = req.user ? req.user.id : null;
  const guestId = req.guest ? req.guest.id : null;
  const delegate = req.query.delegate || null;
  const isAdmin = req.user && req.user.role === 'admin';
  
  try {
    const visibilityClause = buildStoryVisibilityClause(userId, guestId, delegate);
    
    // Admins can see all stories regardless of visibility
    const whereClause = isAdmin ? undefined : visibilityClause;
    
    const storyItems = await db.query.stories.findMany({
      where: whereClause,
      with: { media: true, stats: true },
      orderBy: (stories, { desc }) => [desc(stories.createdAt)],
    });
    
    let personalized = storyItems;
    
    if (userId) {
      const withReactions = await attachMyStoryReactions(storyItems, userId);
      personalized = await attachMyStoryViews(withReactions, userId);
    } else if (guestId) {
      const withReactions = await attachGuestStoryReactions(storyItems, guestId);
      personalized = await attachGuestStoryViews(withReactions, guestId);
    }
    
    return success(res, personalized, 'Stories fetched successfully');
  } catch (err) {
    console.error('[Story][get-stories] Error:', err);
    return error(res, 'Failed to fetch stories', 500, err.message);
  }
};

// Get a single story by ID
const getStoryById = async (req, res) => {
  const { storyId } = req.params;
  const userId = req.user ? req.user.id : null;
  const guestId = req.guest ? req.guest.id : null;
  
  try {
    const story = await db.query.stories.findFirst({
      where: eq(stories.id, storyId),
      with: { media: true, stats: true },
    });
    
    if (!story) return error(res, 'Story not found', 404);
    
    let personalized = story;
    
    if (userId) {
      const [withReactions] = await attachMyStoryReactions([story], userId);
      [personalized] = await attachMyStoryViews([withReactions], userId);
    } else if (guestId) {
      const [withReactions] = await attachGuestStoryReactions([story], guestId);
      [personalized] = await attachGuestStoryViews([withReactions], guestId);
    }
    
    return success(res, personalized, 'Story fetched successfully');
  } catch (err) {
    console.error('[Story][get-story-by-id] Error:', err);
    return error(res, 'Failed to fetch story', 500, err.message);
  }
};

// Create a new story (admin only)
const createStory = async (req, res) => {
  const {
    authorId,
    authorName,
    authorPosition,
    authorDp,
    topic,
    visibleToGuests,
    visibleToDelegates,
    specialDelegation,
    expiresAt,
    media,
  } = req.body;
  
  // Author identity is required
  if (!authorId) {
    return error(res, 'authorId is required', 400);
  }
  if (!authorName || !String(authorName).trim()) {
    return error(res, 'authorName is required', 400);
  }
  if (!authorPosition || !String(authorPosition).trim()) {
    return error(res, 'authorPosition is required', 400);
  }
  
  // Default expiration to 24 hours from now if not provided
  const defaultExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const storyExpiresAt = expiresAt ? new Date(expiresAt) : defaultExpiresAt;
  
  try {
    let newStoryId;
    
    await upsertAuthor({
      name: authorName,
      position: authorPosition,
      dp: authorDp,
    });
    
    await db.transaction(async (tx) => {
      const [result] = await tx.insert(stories).values({
        authorId: Number(authorId),
        authorName,
        authorPosition,
        authorDp,
        topic: topic || null,
        visibleToGuests: visibleToGuests !== undefined ? Boolean(visibleToGuests) : true,
        visibleToDelegates: visibleToDelegates !== undefined ? Boolean(visibleToDelegates) : true,
        specialDelegation: specialDelegation || null,
        expiresAt: storyExpiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      newStoryId = result.insertId;
      
      if (media && media.length > 0) {
        await tx.insert(storyMedia).values(
          media.map((m, index) => ({
            storyId: newStoryId,
            url: m.url,
            type: m.type,
            orderIndex: index,
          }))
        );
      }
      
      await tx.insert(storyStats).values({
        storyId: newStoryId,
        viewsCount: 0,
        reactionsCount: 0,
        likeCount: 0,
        supportCount: 0,
        appreciateCount: 0,
      });
    });
    
    await invalidateStoryCaches();
    return success(res, { id: newStoryId }, 'Story created successfully', 201);
  } catch (err) {
    console.error('[Story][create-story] Error:', err);
    return error(res, 'Failed to create story', 500, err.message);
  }
};

// Update a story (admin only)
const updateStory = async (req, res) => {
  const { storyId } = req.params;
  const {
    authorId,
    authorName,
    authorPosition,
    authorDp,
    topic,
    visibleToGuests,
    visibleToDelegates,
    specialDelegation,
    expiresAt,
    media,
  } = req.body;
  
  try {
    const [existing] = await db.select().from(stories).where(eq(stories.id, storyId));
    if (!existing) return error(res, 'Story not found', 404);
    
    if (authorName !== undefined || authorPosition !== undefined || authorDp !== undefined) {
      await upsertAuthor({
        name: authorName ?? existing.authorName,
        position: authorPosition ?? existing.authorPosition,
        dp: authorDp ?? existing.authorDp,
      });
    }
    
    const updates = { updatedAt: sql`NOW()` };
    if (authorId !== undefined) updates.authorId = Number(authorId);
    if (authorName !== undefined) updates.authorName = authorName;
    if (authorPosition !== undefined) updates.authorPosition = authorPosition;
    if (topic !== undefined) updates.topic = topic;
    if (authorDp !== undefined) updates.authorDp = authorDp;
    if (visibleToGuests !== undefined) updates.visibleToGuests = Boolean(visibleToGuests);
    if (visibleToDelegates !== undefined) updates.visibleToDelegates = Boolean(visibleToDelegates);
    if (specialDelegation !== undefined) updates.specialDelegation = specialDelegation || null;
    if (expiresAt !== undefined) updates.expiresAt = new Date(expiresAt);
    
    await db.transaction(async (tx) => {
      await tx.update(stories).set(updates).where(eq(stories.id, storyId));
      
      if (Array.isArray(media)) {
        await tx.delete(storyMedia).where(eq(storyMedia.storyId, storyId));
        if (media.length > 0) {
          await tx.insert(storyMedia).values(
            media.map((m, index) => ({
              storyId: Number(storyId),
              url: m.url,
              type: m.type,
              orderIndex: index,
            })),
          );
        }
      }
    });
    
    await invalidateStoryCaches();
    
    const fresh = await db.query.stories.findFirst({
      where: eq(stories.id, storyId),
      with: { media: true, stats: true },
    });
    return success(res, fresh, 'Story updated successfully');
  } catch (err) {
    console.error('[Story][update-story] Error:', err);
    return error(res, 'Failed to update story', 500, err.message);
  }
};

// Delete a story (admin only)
const deleteStory = async (req, res) => {
  const { storyId } = req.params;
  
  try {
    const [existingStory] = await db.select().from(stories).where(eq(stories.id, storyId));
    if (!existingStory) {
      return error(res, 'Story not found', 404);
    }
    
    await db.transaction(async (tx) => {
      await tx.delete(storyMedia).where(eq(storyMedia.storyId, storyId));
      await tx.delete(storyStats).where(eq(storyStats.storyId, storyId));
      await tx.delete(storyReactions).where(eq(storyReactions.storyId, storyId));
      await tx.delete(storyViews).where(eq(storyViews.storyId, storyId));
      await tx.delete(guestStoryReactions).where(eq(guestStoryReactions.storyId, storyId));
      await tx.delete(guestStoryViews).where(eq(guestStoryViews.storyId, storyId));
      await tx.delete(stories).where(eq(stories.id, storyId));
    });
    
    await invalidateStoryCaches();
    return success(res, null, 'Story deleted successfully');
  } catch (err) {
    console.error('[Story][delete-story] Error:', err);
    return error(res, 'Failed to delete story', 500, err.message);
  }
};

// React to a story
const reactToStory = async (req, res) => {
  const { storyId, type } = req.body;
  const userId = req.user ? req.user.id : null;
  const guestId = req.guest ? req.guest.id : null;
  
  if (!storyId) return error(res, 'storyId is required', 400);
  if (!REACTION_TYPES.includes(type)) {
    return error(res, `type must be one of ${REACTION_TYPES.join(', ')}`, 400);
  }
  
  // Guests must have a valid guest ID
  if (!userId && !guestId) {
    return error(res, 'Authentication or guest ID required', 401);
  }
  
  try {
    const nextField = REACTION_TO_FIELD[type];
    const nextColumn = storyStats[nextField];
    let activeReaction = type;
    
    await db.transaction(async (tx) => {
      let existing;
      
      if (userId) {
        // Authenticated user reaction
        [existing] = await tx
          .select()
          .from(storyReactions)
          .where(and(eq(storyReactions.storyId, storyId), eq(storyReactions.userId, userId)));
        
        if (!existing) {
          await tx.insert(storyReactions).values({ storyId, userId, type });
          await tx.update(storyStats)
            .set({
              reactionsCount: sql`${storyStats.reactionsCount} + 1`,
              [nextField]: sql`${nextColumn} + 1`,
            })
            .where(eq(storyStats.storyId, storyId));
          return;
        }
        
        if (existing.type === type) {
          // Toggling off
          await tx.delete(storyReactions).where(eq(storyReactions.id, existing.id));
          await tx.update(storyStats)
            .set({
              reactionsCount: sql`GREATEST(${storyStats.reactionsCount} - 1, 0)`,
              [nextField]: sql`GREATEST(${nextColumn} - 1, 0)`,
            })
            .where(eq(storyStats.storyId, storyId));
          activeReaction = null;
          return;
        }
        
        // Switching reactions
        const prevField = REACTION_TO_FIELD[existing.type];
        await tx.update(storyReactions)
          .set({ type })
          .where(eq(storyReactions.id, existing.id));
        
        const updates = { [nextField]: sql`${nextColumn} + 1` };
        if (prevField) {
          const prevColumn = storyStats[prevField];
          updates[prevField] = sql`GREATEST(${prevColumn} - 1, 0)`;
        }
        await tx.update(storyStats).set(updates).where(eq(storyStats.storyId, storyId));
        
      } else if (guestId) {
        // Guest user reaction
        [existing] = await tx
          .select()
          .from(guestStoryReactions)
          .where(and(eq(guestStoryReactions.storyId, storyId), eq(guestStoryReactions.guestId, guestId)));
        
        if (!existing) {
          await tx.insert(guestStoryReactions).values({ storyId, guestId, type });
          await tx.update(storyStats)
            .set({
              reactionsCount: sql`${storyStats.reactionsCount} + 1`,
              [nextField]: sql`${nextColumn} + 1`,
            })
            .where(eq(storyStats.storyId, storyId));
          return;
        }
        
        if (existing.type === type) {
          // Toggling off
          await tx.delete(guestStoryReactions).where(eq(guestStoryReactions.id, existing.id));
          await tx.update(storyStats)
            .set({
              reactionsCount: sql`GREATEST(${storyStats.reactionsCount} - 1, 0)`,
              [nextField]: sql`GREATEST(${nextColumn} - 1, 0)`,
            })
            .where(eq(storyStats.storyId, storyId));
          activeReaction = null;
          return;
        }
        
        // Switching reactions
        const prevField = REACTION_TO_FIELD[existing.type];
        await tx.update(guestStoryReactions)
          .set({ type })
          .where(eq(guestStoryReactions.id, existing.id));
        
        const updates = { [nextField]: sql`${nextColumn} + 1` };
        if (prevField) {
          const prevColumn = storyStats[prevField];
          updates[prevField] = sql`GREATEST(${prevColumn} - 1, 0)`;
        }
        await tx.update(storyStats).set(updates).where(eq(storyStats.storyId, storyId));
      }
      
      await bumpStoryUpdatedAt(storyId, tx);
    });
    
    await invalidateStoryCaches();
    return success(res, { myReaction: activeReaction }, 'Reaction updated');
  } catch (err) {
    console.error('[Story][react-to-story] Error:', err);
    return error(res, 'Failed to react', 500, err.message);
  }
};

// View a story
const viewStory = async (req, res) => {
  const { storyId } = req.body;
  const userId = req.user ? req.user.id : null;
  const guestId = req.guest ? req.guest.id : null;
  
  if (!storyId) return error(res, 'storyId is required', 400);
  
  // Guests must have a valid guest ID
  if (!userId && !guestId) {
    return error(res, 'Authentication or guest ID required', 401);
  }
  
  const viewKey = userId ? `story_view:${storyId}:${userId}` : `guest_story_view:${storyId}:${guestId}`;
  const cached = await redis.get(viewKey);
  if (cached) return success(res, null, 'View already recorded');
  
  await redis.set(viewKey, '1', 'EX', 86400);
  
  let inserted = false;
  try {
    let result;
    
    if (userId) {
      [result] = await db.insert(storyViews).values({
        storyId: Number(storyId),
        userId: Number(userId),
        viewedAt: new Date(),
      }).onDuplicateKeyUpdate({ set: { userId: Number(userId) } });
    } else if (guestId) {
      [result] = await db.insert(guestStoryViews).values({
        storyId: Number(storyId),
        guestId: guestId,
        viewedAt: new Date(),
      }).onDuplicateKeyUpdate({ set: { guestId: guestId } });
    }
    
    inserted = result && result.affectedRows === 1;
  } catch (err) {
    console.error('[Story][view-story] Failed to record view', err);
  }
  
  if (inserted) {
    await db.update(storyStats)
      .set({ viewsCount: sql`${storyStats.viewsCount} + 1` })
      .where(eq(storyStats.storyId, storyId));
    await bumpStoryUpdatedAt(storyId);
    await invalidateStoryCaches();
  }
  
  return success(res, null, 'View recorded');
};

// Get all stories for admin panel (including expired)
const getAllStoriesAdmin = async (req, res) => {
  try {
    const storyItems = await db.query.stories.findMany({
      with: { media: true, stats: true },
      orderBy: (stories, { desc }) => [desc(stories.createdAt)],
    });
    
    return success(res, storyItems, 'Stories fetched successfully');
  } catch (err) {
    console.error('[Story][get-all-stories-admin] Error:', err);
    return error(res, 'Failed to fetch stories', 500, err.message);
  }
};

module.exports = {
  getStories,
  getStoryById,
  createStory,
  updateStory,
  deleteStory,
  reactToStory,
  viewStory,
  getAllStoriesAdmin,
};
