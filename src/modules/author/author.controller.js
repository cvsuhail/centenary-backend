const { like, desc, sql, and, eq } = require('drizzle-orm');
const db = require('../../common/db');
const { authors } = require('../../common/schema');
const { success, error } = require('../../common/response');

const listAuthors = async (req, res) => {
  const query = String(req.query.query || '').trim();
  const limit = Math.min(Number(req.query.limit) || 10, 50);

  if (!query) return success(res, [], 'Authors');

  try {
    const rows = await db
      .select()
      .from(authors)
      .where(like(authors.name, `${query}%`))
      .orderBy(desc(authors.updatedAt))
      .limit(limit);

    return success(res, rows, 'Authors');
  } catch (err) {
    console.error('[Author][list] Error:', err);
    return error(res, 'Failed to fetch authors', 500, err.message);
  }
};

const upsertAuthor = async ({ name, position, dp }) => {
  const safeName = String(name || '').trim();
  const safePosition = String(position || '').trim();
  const safeDp = dp ? String(dp).trim() : null;

  if (!safeName || !safePosition) return;

  const existing = await db.query.authors.findFirst({
    where: and(eq(authors.name, safeName), eq(authors.position, safePosition)),
  });

  if (!existing) {
    await db.insert(authors).values({
      name: safeName,
      position: safePosition,
      dp: safeDp,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return;
  }

  const updates = { updatedAt: sql`NOW()` };
  if (safeDp && safeDp !== existing.dp) updates.dp = safeDp;

  if (Object.keys(updates).length > 1) {
    await db
      .update(authors)
      .set(updates)
      .where(eq(authors.id, existing.id));
  }
};

module.exports = {
  listAuthors,
  upsertAuthor,
};
