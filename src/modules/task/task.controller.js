const { eq } = require('drizzle-orm');
const db = require('../../common/db');
const { tasks } = require('../../common/schema');
const { success, error } = require('../../common/response');

const getTasks = async (req, res) => {
  try {
    const allTasks = await db.select().from(tasks).orderBy(tasks.createdAt);
    return success(res, allTasks, 'Tasks fetched successfully');
  } catch (err) {
    return error(res, 'Failed to fetch tasks', 500, err.message);
  }
};

const updateTask = async (req, res) => {
  const { id, status, title, description } = req.body;

  if (!id) return error(res, 'Task ID is required', 400);

  try {
    await db.update(tasks)
      .set({ status, title, description, updatedAt: new Date() })
      .where(eq(tasks.id, id));

    const [updated] = await db.select().from(tasks).where(eq(tasks.id, id));
    return success(res, updated, 'Task updated successfully');
  } catch (err) {
    return error(res, 'Failed to update task', 500, err.message);
  }
};

module.exports = { getTasks, updateTask };
