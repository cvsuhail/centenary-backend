const { eq, and } = require('drizzle-orm');
const db = require('../../common/db');
const { tasks, taskAttachments, taskCompletions } = require('../../common/schema');
const { success, error } = require('../../common/response');

const getTasks = async (req, res) => {
  try {
    const user = req.user;
    const isGuest = req.isGuest;

    // If guest, only return tasks where visibleToGuests is true
    if (isGuest) {
      const guestTasks = await db.select()
        .from(tasks)
        .where(eq(tasks.visibleToGuests, true))
        .orderBy(tasks.createdAt);
      return success(res, guestTasks, 'Tasks fetched successfully');
    }

    // For authenticated users, filter by delegation if specified
    let query = db.select().from(tasks);
    
    if (user?.delegate && user.delegate !== 'ALL') {
      query = query.where(eq(tasks.delegation, user.delegate));
    }

    const allTasks = await query.orderBy(tasks.createdAt);
    return success(res, allTasks, 'Tasks fetched successfully');
  } catch (err) {
    return error(res, 'Failed to fetch tasks', 500, err.message);
  }
};

const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const isGuest = req.isGuest;

    const [task] = await db.select().from(tasks).where(eq(tasks.id, parseInt(id)));

    if (!task) {
      return error(res, 'Task not found', 404);
    }

    // Check visibility
    if (isGuest && !task.visibleToGuests) {
      return error(res, 'Task not visible to guests', 403);
    }

    if (user?.delegate && user.delegate !== 'ALL' && task.delegation && task.delegation !== user.delegate) {
      return error(res, 'Task not visible to your delegation', 403);
    }

    // Get attachments
    const attachments = await db.select()
      .from(taskAttachments)
      .where(eq(taskAttachments.taskId, parseInt(id)))
      .orderBy(taskAttachments.orderIndex);

    // Get completion status for this user
    let completion = null;
    if (user?.id) {
      const [userCompletion] = await db.select()
        .from(taskCompletions)
        .where(
          and(
            eq(taskCompletions.taskId, parseInt(id)),
            eq(taskCompletions.userId, user.id)
          )
        );
      completion = userCompletion;
    }

    return success(res, { ...task, attachments, completed: !!completion }, 'Task fetched successfully');
  } catch (err) {
    return error(res, 'Failed to fetch task', 500, err.message);
  }
};

const createTask = async (req, res) => {
  try {
    const { title, description, startDate, endDate, delegation, attachments } = req.body;

    if (!title || !description || !startDate || !endDate) {
      return error(res, 'Title, description, start date, and end date are required', 400);
    }

    const result = await db.insert(tasks)
      .values({
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        delegation: delegation || null,
        visibleToGuests: false,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    const newTaskId = result[0].insertId;

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      for (let i = 0; i < attachments.length; i++) {
        const { url, type, fileName } = attachments[i];
        await db.insert(taskAttachments).values({
          taskId: newTaskId,
          url: url || null,
          type,
          fileName,
          orderIndex: i,
        });
      }
    }

    // Fetch the created task
    const [newTask] = await db.select().from(tasks).where(eq(tasks.id, newTaskId));

    return success(res, newTask, 'Task created successfully');
  } catch (err) {
    return error(res, 'Failed to create task', 500, err.message);
  }
};

const updateTask = async (req, res) => {
  const { id, title, description, startDate, endDate, delegation, status, attachments } = req.body;

  if (!id) return error(res, 'Task ID is required', 400);

  try {
    await db.update(tasks)
      .set({
        title,
        description,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        delegation: delegation !== undefined ? delegation : undefined,
        visibleToGuests: false,
        status: status !== undefined ? status : undefined,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id));

    // Update attachments if provided
    if (attachments !== undefined) {
      // Delete existing attachments
      await db.delete(taskAttachments).where(eq(taskAttachments.taskId, id));
      
      // Add new attachments
      if (attachments.length > 0) {
        for (let i = 0; i < attachments.length; i++) {
          const { url, type, fileName } = attachments[i];
          await db.insert(taskAttachments).values({
            taskId: id,
            url,
            type,
            fileName,
            orderIndex: i,
          });
        }
      }
    }

    const [updated] = await db.select().from(tasks).where(eq(tasks.id, id));
    return success(res, updated, 'Task updated successfully');
  } catch (err) {
    return error(res, 'Failed to update task', 500, err.message);
  }
};

const deleteTask = async (req, res) => {
  const { id } = req.params;

  try {
    // Delete attachments first
    await db.delete(taskAttachments).where(eq(taskAttachments.taskId, parseInt(id)));
    
    // Delete completions
    await db.delete(taskCompletions).where(eq(taskCompletions.taskId, parseInt(id)));
    
    // Delete task
    await db.delete(tasks).where(eq(tasks.id, parseInt(id)));

    return success(res, null, 'Task deleted successfully');
  } catch (err) {
    return error(res, 'Failed to delete task', 500, err.message);
  }
};

const markTaskComplete = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user?.id) {
      return error(res, 'User must be authenticated to mark task complete', 401);
    }

    // Check if already completed
    const [existing] = await db.select()
      .from(taskCompletions)
      .where(
        and(
          eq(taskCompletions.taskId, parseInt(id)),
          eq(taskCompletions.userId, user.id)
        )
      );

    if (existing) {
      return success(res, existing, 'Task already marked complete');
    }

    // Mark as complete
    const result = await db.insert(taskCompletions)
      .values({
        taskId: parseInt(id),
        userId: user.id,
        completedAt: new Date(),
      });

    const [completion] = await db.select()
      .from(taskCompletions)
      .where(eq(taskCompletions.id, result[0].insertId));

    return success(res, completion, 'Task marked complete');
  } catch (err) {
    return error(res, 'Failed to mark task complete', 500, err.message);
  }
};

const getTaskStatistics = async (req, res) => {
  try {
    const allTasks = await db.select().from(tasks).orderBy(tasks.createdAt);
    const statistics = [];

    for (const task of allTasks) {
      // Count total allocated users (users in the task's delegation)
      let allocatedCount = 0;
      if (task.delegation && task.delegation !== 'ALL') {
        const allocatedUsers = await db.select()
          .from(require('../../common/schema').users)
          .where(eq(require('../../common/schema').users.delegate, task.delegation));
        allocatedCount = allocatedUsers.length;
      } else {
        // ALL delegation means all users
        const allUsers = await db.select().from(require('../../common/schema').users);
        allocatedCount = allUsers.length;
      }

      // Count completed users
      const completions = await db.select()
        .from(taskCompletions)
        .where(eq(taskCompletions.taskId, task.id));
      const completedCount = completions.length;

      // Count users near deadline (within 3 days of end date)
      const now = new Date();
      const deadline = new Date(task.endDate);
      const threeDaysBeforeDeadline = new Date(deadline);
      threeDaysBeforeDeadline.setDate(threeDaysBeforeDeadline.getDate() - 3);

      const nearDeadlineCount = now >= threeDaysBeforeDeadline && now <= deadline ? 
        allocatedCount - completedCount : 0;

      statistics.push({
        taskId: task.id,
        title: task.title,
        allocatedCount,
        completedCount,
        pendingCount: allocatedCount - completedCount,
        nearDeadlineCount,
        deadline: task.endDate,
      });
    }

    return success(res, statistics, 'Task statistics fetched successfully');
  } catch (err) {
    return error(res, 'Failed to fetch task statistics', 500, err.message);
  }
};

const sendTaskReminder = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { message } = req.body;

    // Get task details
    const [task] = await db.select().from(tasks).where(eq(tasks.id, parseInt(taskId)));
    if (!task) {
      return error(res, 'Task not found', 404);
    }

    // Get users who haven't completed this task
    const completedUserIds = (await db.select()
      .from(taskCompletions)
      .where(eq(taskCompletions.taskId, parseInt(taskId))))
      .map(c => c.userId);

    // Get users in the task's delegation who haven't completed
    let eligibleUsers = [];
    if (task.delegation && task.delegation !== 'ALL') {
      eligibleUsers = await db.select()
        .from(require('../../common/schema').users)
        .where(eq(require('../../common/schema').users.delegate, task.delegation));
    } else {
      eligibleUsers = await db.select().from(require('../../common/schema').users);
    }

    const incompleteUsers = eligibleUsers.filter(user => !completedUserIds.includes(user.id));

    // TODO: Integrate with push notification service (FCM, OneSignal, etc.)
    // For now, just return the count of users who would receive the notification
    return success(res, {
      notifiedCount: incompleteUsers.length,
      users: incompleteUsers.map(u => ({ id: u.id, phone: u.phone, name: u.name })),
      message: message || `Reminder: Task "${task.title}" deadline is approaching!`,
    }, 'Reminder notification queued successfully');
  } catch (err) {
    return error(res, 'Failed to send reminder', 500, err.message);
  }
};

const getTaskCompletionDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Get task details
    const [task] = await db.select().from(tasks).where(eq(tasks.id, parseInt(id)));
    if (!task) {
      return error(res, 'Task not found', 404);
    }

    // Get all completions for this task
    const completions = await db.select()
      .from(taskCompletions)
      .where(eq(taskCompletions.taskId, parseInt(id)));

    const completedUserIds = completions.map(c => c.userId);

    // Get users in the task's delegation
    let eligibleUsers = [];
    if (task.delegation && task.delegation !== 'ALL') {
      eligibleUsers = await db.select()
        .from(require('../../common/schema').users)
        .where(eq(require('../../common/schema').users.delegate, task.delegation));
    } else {
      eligibleUsers = await db.select().from(require('../../common/schema').users);
    }

    // Separate into completed and incomplete users
    const completedUsers = [];
    const incompleteUsers = [];

    for (const user of eligibleUsers) {
      const completion = completions.find(c => c.userId === user.id);
      if (completion) {
        completedUsers.push({
          ...user,
          completedAt: completion.completedAt,
        });
      } else {
        incompleteUsers.push(user);
      }
    }

    return success(res, {
      task,
      completedUsers,
      incompleteUsers,
      totalAllocated: eligibleUsers.length,
      totalCompleted: completedUsers.length,
      totalIncomplete: incompleteUsers.length,
    }, 'Task completion details fetched successfully');
  } catch (err) {
    return error(res, 'Failed to fetch task completion details', 500, err.message);
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  markTaskComplete,
  getTaskStatistics,
  sendTaskReminder,
  getTaskCompletionDetails,
};
