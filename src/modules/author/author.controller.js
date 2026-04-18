const { like, desc, sql, and, eq } = require('drizzle-orm');
const db = require('../../common/db');
const { authors } = require('../../common/schema');
const { success, error } = require('../../common/response');

const listAuthors = async (req, res) => {
  const query = String(req.query.query || '').trim();
  const limit = Math.min(Number(req.query.limit) || 10, 50);

  try {
    const base = db.select().from(authors);
    const filtered = query ? base.where(like(authors.name, `${query}%`)) : base;
    const rows = await filtered.orderBy(desc(authors.updatedAt)).limit(limit);

    return success(res, rows, 'Authors');
  } catch (err) {
    console.error('[Author][list] Error:', err);
    const cause = err?.cause || err;
    if (cause?.code === 'ER_NO_SUCH_TABLE') {
      return success(res, [], 'Authors');
    }
    return error(res, 'Failed to fetch authors', 500, err.message);
  }
};

const createAuthor = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const position = String(req.body?.position || '').trim();
    const dp = req.body?.dp ? String(req.body.dp).trim() : null;

    if (!name || !position) {
      return error(res, 'Name and position are required', 400);
    }

    const existing = await db.query.authors.findFirst({
      where: and(eq(authors.name, name), eq(authors.position, position)),
    });

    if (existing) {
      return success(res, existing, 'Author already exists');
    }

    const [{ insertId }] = await db.insert(authors).values({
      name,
      position,
      dp,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const row = insertId
      ? await db.query.authors.findFirst({
          where: eq(authors.id, Number(insertId)),
        })
      : null;

    return success(
      res,
      row || { id: insertId, name, position, dp },
      'Author created',
      201,
    );
  } catch (err) {
    const cause = err?.cause || err;
    if (cause?.code === 'ER_NO_SUCH_TABLE') {
      return error(
        res,
        'Authors table is not initialized. Run database migrations and restart the server.',
        503,
      );
    }
    console.error('[Author][create] Error:', err);
    return error(res, 'Failed to create author', 500, err.message);
  }
};

const updateAuthor = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return error(res, 'Invalid author id', 400);

    const existing = await db.query.authors.findFirst({
      where: eq(authors.id, id),
    });
    if (!existing) return error(res, 'Author not found', 404);

    const name = req.body?.name != null ? String(req.body.name).trim() : existing.name;
    const position =
      req.body?.position != null
        ? String(req.body.position).trim()
        : existing.position;
    const dp = req.body?.dp != null ? String(req.body.dp).trim() : existing.dp;

    if (!name || !position) {
      return error(res, 'Name and position are required', 400);
    }

    const dup = await db.query.authors.findFirst({
      where: and(eq(authors.name, name), eq(authors.position, position)),
    });
    if (dup && dup.id !== id) {
      return error(res, 'An author with the same name and position already exists', 409);
    }

    await db
      .update(authors)
      .set({ name, position, dp, updatedAt: sql`NOW()` })
      .where(eq(authors.id, id));

    const row = await db.query.authors.findFirst({ where: eq(authors.id, id) });
    return success(res, row, 'Author updated');
  } catch (err) {
    const cause = err?.cause || err;
    if (cause?.code === 'ER_NO_SUCH_TABLE') {
      return error(
        res,
        'Authors table is not initialized. Run database migrations and restart the server.',
        503,
      );
    }
    console.error('[Author][update] Error:', err);
    return error(res, 'Failed to update author', 500, err.message);
  }
};

const deleteAuthor = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return error(res, 'Invalid author id', 400);

    const existing = await db.query.authors.findFirst({
      where: eq(authors.id, id),
    });
    if (!existing) return error(res, 'Author not found', 404);

    await db.delete(authors).where(eq(authors.id, id));
    return success(res, { id }, 'Author deleted');
  } catch (err) {
    const cause = err?.cause || err;
    if (cause?.code === 'ER_NO_SUCH_TABLE') {
      return error(
        res,
        'Authors table is not initialized. Run database migrations and restart the server.',
        503,
      );
    }
    console.error('[Author][delete] Error:', err);
    return error(res, 'Failed to delete author', 500, err.message);
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
  createAuthor,
  updateAuthor,
  deleteAuthor,
  upsertAuthor,
};
