const { mysqlTable, int, varchar, boolean, datetime, json, text, uniqueIndex } = require('drizzle-orm/mysql-core');
const { relations } = require('drizzle-orm');

// ─── USERS ──────────────────────────────────────────────────────────────────
const users = mysqlTable('users', {
  id:            int('id').primaryKey().autoincrement(),
  phone:         varchar('phone', { length: 20 }).notNull().unique(),
  delegate:      varchar('delegate', { length: 50 }),
  name:          varchar('name', { length: 255 }),
  dob:           datetime('dob'),
  entityDetails: json('entity_details'),
  createdAt:     datetime('created_at').notNull().default(new Date()),
  updatedAt:     datetime('updated_at').notNull().default(new Date()),
});

const usersRelations = relations(users, ({ many }) => ({
  reactions: many(reactions),
}));

// ─── POSTS ──────────────────────────────────────────────────────────────────
const posts = mysqlTable('posts', {
  id:            int('id').primaryKey().autoincrement(),
  title:         varchar('title', { length: 500 }).notNull(),
  description:   text('description'),
  mediaType:     varchar('media_type', { length: 50 }),
  mediaLayout:   varchar('media_layout', { length: 50 }),
  authorName:    varchar('author_name', { length: 255 }),
  authorDp:      varchar('author_dp', { length: 1000 }),
  delegation:    varchar('delegation', { length: 100 }),
  isImportant:   boolean('is_important').notNull().default(false),
  priorityStart: datetime('priority_start'),
  priorityEnd:   datetime('priority_end'),
  createdAt:     datetime('created_at').notNull().default(new Date()),
  updatedAt:     datetime('updated_at').notNull().default(new Date()),
});

const postsRelations = relations(posts, ({ many, one }) => ({
  media:     many(postMedia),
  stats:     one(postStats, { fields: [posts.id], references: [postStats.postId] }),
  reactions: many(reactions),
}));

// ─── POST MEDIA ─────────────────────────────────────────────────────────────
const postMedia = mysqlTable('post_media', {
  id:         int('id').primaryKey().autoincrement(),
  postId:     int('post_id').notNull(),
  url:        varchar('url', { length: 1000 }).notNull(),
  type:       varchar('type', { length: 50 }).notNull(),
  orderIndex: int('order_index').notNull().default(0),
});

const postMediaRelations = relations(postMedia, ({ one }) => ({
  post: one(posts, { fields: [postMedia.postId], references: [posts.id] }),
}));

// ─── POST STATS ─────────────────────────────────────────────────────────────
const postStats = mysqlTable('post_stats', {
  postId:         int('post_id').primaryKey(),
  viewsCount:     int('views_count').notNull().default(0),
  reactionsCount: int('reactions_count').notNull().default(0),
  shareCount:     int('share_count').notNull().default(0),
});

const postStatsRelations = relations(postStats, ({ one }) => ({
  post: one(posts, { fields: [postStats.postId], references: [posts.id] }),
}));

// ─── REACTIONS ──────────────────────────────────────────────────────────────
const reactions = mysqlTable('reactions', {
  id:     int('id').primaryKey().autoincrement(),
  postId: int('post_id').notNull(),
  userId: int('user_id').notNull(),
  type:   varchar('type', { length: 50 }).notNull(),
}, (table) => ({
  uniqReaction: uniqueIndex('uniq_reaction').on(table.postId, table.userId),
}));

const reactionsRelations = relations(reactions, ({ one }) => ({
  post: one(posts, { fields: [reactions.postId], references: [posts.id] }),
  user: one(users, { fields: [reactions.userId], references: [users.id] }),
}));

// ─── TASKS ──────────────────────────────────────────────────────────────────
const tasks = mysqlTable('tasks', {
  id:          int('id').primaryKey().autoincrement(),
  title:       varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  status:      varchar('status', { length: 50 }).notNull().default('PENDING'),
  createdAt:   datetime('created_at').notNull().default(new Date()),
  updatedAt:   datetime('updated_at').notNull().default(new Date()),
});

module.exports = {
  users,
  usersRelations,
  posts,
  postsRelations,
  postMedia,
  postMediaRelations,
  postStats,
  postStatsRelations,
  reactions,
  reactionsRelations,
  tasks,
};
