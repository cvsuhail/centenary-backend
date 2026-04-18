const db = require('../../common/db');
const { eventConfig } = require('../../common/schema');
const { eq } = require('drizzle-orm');
const { success, error } = require('../../common/response');

// The event config is a singleton — we always read/write id=1. If the row
// doesn't exist yet (fresh DB before the seed migration ran) we return a
// sensible default so mobile doesn't crash, but we do NOT auto-insert
// here; that's the migration's job.
const DEFAULT_CONFIG = {
  id: 1,
  countdownTitle: 'Samastha Centenary',
  countdownTarget: new Date('2026-05-15T00:00:00Z'),
  updatedAt: null,
};

// GET /api/event-config   (public)
const getConfig = async (_req, res) => {
  try {
    const [row] = await db.select().from(eventConfig).where(eq(eventConfig.id, 1));
    return success(res, row || DEFAULT_CONFIG);
  } catch (err) {
    console.error('[EventConfig][getConfig]', err);
    return error(res, 'Failed to fetch event config', 500);
  }
};

// PUT /api/event-config   (admin)
// Partial update: only the provided fields are written. If the row is
// missing we insert it — this makes the endpoint idempotent across a
// fresh DB where the seed migration was skipped for some reason.
const updateConfig = async (req, res) => {
  const { countdownTitle, countdownTarget } = req.body || {};

  const patch = {};
  if (countdownTitle !== undefined) {
    if (!countdownTitle || typeof countdownTitle !== 'string') {
      return error(res, 'countdownTitle must be a non-empty string', 400);
    }
    patch.countdownTitle = countdownTitle.trim().slice(0, 255);
  }
  if (countdownTarget !== undefined) {
    const d = new Date(countdownTarget);
    if (Number.isNaN(d.getTime())) {
      return error(res, 'countdownTarget must be a valid ISO date', 400);
    }
    patch.countdownTarget = d;
  }
  if (Object.keys(patch).length === 0) {
    return error(res, 'Nothing to update', 400);
  }

  try {
    const [existing] = await db.select().from(eventConfig).where(eq(eventConfig.id, 1));
    const now = new Date();

    if (existing) {
      await db.update(eventConfig).set({ ...patch, updatedAt: now }).where(eq(eventConfig.id, 1));
    } else {
      await db.insert(eventConfig).values({
        id: 1,
        countdownTitle: patch.countdownTitle || DEFAULT_CONFIG.countdownTitle,
        countdownTarget: patch.countdownTarget || DEFAULT_CONFIG.countdownTarget,
        updatedAt: now,
      });
    }

    const [row] = await db.select().from(eventConfig).where(eq(eventConfig.id, 1));
    return success(res, row, 'Event config updated');
  } catch (err) {
    console.error('[EventConfig][updateConfig]', err);
    return error(res, 'Failed to update event config', 500);
  }
};

module.exports = { getConfig, updateConfig };
