const db = require('../../common/db');
const { announcements } = require('../../common/schema');
const { eq, and, or, isNull, lte, gte, desc } = require('drizzle-orm');
const { success, error } = require('../../common/response');

// ─── Helpers ───────────────────────────────────────────────────────────────

const ACTION_TYPES = ['none', 'url', 'route'];

// Normalises a body payload from the admin panel. Returns a new object
// ready to insert/update; throws a 400 Error if something's off so we can
// surface the message to the UI cleanly.
const normalize = (body = {}, { partial = false } = {}) => {
  const out = {};

  if (!partial || body.title !== undefined) {
    if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
      const e = new Error('title is required'); e.status = 400; throw e;
    }
    out.title = body.title.trim().slice(0, 255);
  }

  if (body.body !== undefined) out.body = body.body ? String(body.body) : null;
  if (body.icon !== undefined) {
    out.icon = body.icon && String(body.icon).trim().length
      ? String(body.icon).trim().slice(0, 100)
      : 'campaign';
  }
  if (body.ctaLabel !== undefined) {
    out.ctaLabel = body.ctaLabel ? String(body.ctaLabel).trim().slice(0, 100) : null;
  }
  if (body.actionType !== undefined) {
    if (!ACTION_TYPES.includes(body.actionType)) {
      const e = new Error(`actionType must be one of ${ACTION_TYPES.join(', ')}`);
      e.status = 400; throw e;
    }
    out.actionType = body.actionType;
  }
  if (body.actionValue !== undefined) {
    out.actionValue = body.actionValue ? String(body.actionValue).slice(0, 1000) : null;
  }
  if (body.active !== undefined) out.active = !!body.active;

  // startsAt/endsAt accept ISO strings or null. Empty string → null so the
  // admin form can clear a previously-scheduled window.
  if (body.startsAt !== undefined) {
    out.startsAt = body.startsAt ? new Date(body.startsAt) : null;
  }
  if (body.endsAt !== undefined) {
    out.endsAt = body.endsAt ? new Date(body.endsAt) : null;
  }

  return out;
};

// ─── Admin CRUD ────────────────────────────────────────────────────────────

// GET /api/announcements   (admin)
// Returns every announcement, newest first — the admin list wants to see
// inactive + scheduled rows too, so we don't filter here.
const list = async (_req, res) => {
  try {
    const rows = await db.select().from(announcements).orderBy(desc(announcements.createdAt));
    return success(res, rows);
  } catch (err) {
    console.error('[Announcements][list]', err);
    return error(res, 'Failed to list announcements', 500);
  }
};

// GET /api/announcements/:id   (admin)
const getById = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return error(res, 'Invalid id', 400);
  try {
    const [row] = await db.select().from(announcements).where(eq(announcements.id, id));
    if (!row) return error(res, 'Not found', 404);
    return success(res, row);
  } catch (err) {
    console.error('[Announcements][getById]', err);
    return error(res, 'Failed to fetch announcement', 500);
  }
};

// POST /api/announcements   (admin)
const create = async (req, res) => {
  try {
    const payload = normalize(req.body || {});
    const now = new Date();
    const [{ insertId }] = await db.insert(announcements).values({
      ...payload,
      createdAt: now,
      updatedAt: now,
    });
    const [row] = await db.select().from(announcements).where(eq(announcements.id, insertId));
    return success(res, row, 'Announcement created', 201);
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    console.error('[Announcements][create]', err);
    return error(res, 'Failed to create announcement', 500);
  }
};

// PUT /api/announcements/:id   (admin)
const update = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return error(res, 'Invalid id', 400);
  try {
    const payload = normalize(req.body || {}, { partial: true });
    payload.updatedAt = new Date();
    await db.update(announcements).set(payload).where(eq(announcements.id, id));
    const [row] = await db.select().from(announcements).where(eq(announcements.id, id));
    if (!row) return error(res, 'Not found', 404);
    return success(res, row, 'Announcement updated');
  } catch (err) {
    if (err.status) return error(res, err.message, err.status);
    console.error('[Announcements][update]', err);
    return error(res, 'Failed to update announcement', 500);
  }
};

// DELETE /api/announcements/:id   (admin)
const remove = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return error(res, 'Invalid id', 400);
  try {
    await db.delete(announcements).where(eq(announcements.id, id));
    return success(res, { id }, 'Announcement deleted');
  } catch (err) {
    console.error('[Announcements][remove]', err);
    return error(res, 'Failed to delete announcement', 500);
  }
};

// ─── Mobile ─────────────────────────────────────────────────────────────────

// GET /api/announcements/active   (public)
// Returns the single most-recent announcement that is:
//   • active = true
//   • starts_at IS NULL OR starts_at <= now
//   • ends_at   IS NULL OR ends_at   >= now
// If nothing matches we return `null` (not a 404) so the mobile client
// can treat "no live announcement" as the normal case.
const getActive = async (_req, res) => {
  try {
    const now = new Date();
    const rows = await db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.active, true),
          or(isNull(announcements.startsAt), lte(announcements.startsAt, now)),
          or(isNull(announcements.endsAt), gte(announcements.endsAt, now)),
        ),
      )
      .orderBy(desc(announcements.createdAt))
      .limit(1);
    return success(res, rows[0] || null);
  } catch (err) {
    console.error('[Announcements][getActive]', err);
    return error(res, 'Failed to fetch active announcement', 500);
  }
};

module.exports = { list, getById, create, update, remove, getActive };
