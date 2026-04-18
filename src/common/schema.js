const { mysqlTable, int, varchar, boolean, datetime, json, text, uniqueIndex, primaryKey } = require('drizzle-orm/mysql-core');
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
  authorName:     varchar('author_name', { length: 255 }),
  authorPosition: varchar('author_position', { length: 255 }),
  authorDp:       varchar('author_dp', { length: 1000 }),
  delegation:     varchar('delegation', { length: 100 }),
  isImportant:    boolean('is_important').notNull().default(false),
  isHomeFeed:     boolean('is_home_feed').notNull().default(false),
  priorityStart:  datetime('priority_start'),
  priorityEnd:    datetime('priority_end'),
  createdAt:     datetime('created_at').notNull().default(new Date()),
  updatedAt:     datetime('updated_at').notNull().default(new Date()),
});

const postsRelations = relations(posts, ({ many, one }) => ({
  media:     many(postMedia),
  stats:     one(postStats, { fields: [posts.id], references: [postStats.postId] }),
  reactions: many(reactions),
  views:     many(postViews),
}));

// ─── POST VIEWS ─────────────────────────────────────────────────────────────
// Persisted "has this user viewed this post?" set. Promoted out of Redis
// (which used a 24h TTL'd key) so the mobile app's "show unviewed posts
// first" sort still holds after a day of app inactivity.
const postViews = mysqlTable('post_views', {
  postId:   int('post_id').notNull(),
  userId:   int('user_id').notNull(),
  viewedAt: datetime('viewed_at').notNull().default(new Date()),
}, (table) => ({
  pk: primaryKey({ columns: [table.postId, table.userId] }),
}));

const postViewsRelations = relations(postViews, ({ one }) => ({
  post: one(posts, { fields: [postViews.postId], references: [posts.id] }),
  user: one(users, { fields: [postViews.userId], references: [users.id] }),
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
// reactionsCount is the aggregate across all reaction types; the per-type
// counts (likeCount, supportCount, appreciateCount) are stored alongside so
// the clients can render each emoji's count without a join.
const postStats = mysqlTable('post_stats', {
  postId:          int('post_id').primaryKey(),
  viewsCount:      int('views_count').notNull().default(0),
  reactionsCount:  int('reactions_count').notNull().default(0),
  likeCount:       int('like_count').notNull().default(0),
  supportCount:    int('support_count').notNull().default(0),
  appreciateCount: int('appreciate_count').notNull().default(0),
  shareCount:      int('share_count').notNull().default(0),
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

// ─── ANNOUNCEMENTS ──────────────────────────────────────────────────────────
// Powers the sticky dock above the mobile bottom nav. `active` gates whether
// the announcement is visible at all; `startsAt`/`endsAt` are optional
// windows layered on top of `active` so the admin can schedule in advance
// without having to toggle the flag manually.
//
// `actionType` + `actionValue` together describe what happens on the CTA
// press in mobile:
//   none  → no CTA rendered
//   url   → open external URL via url_launcher
//   route → Navigator.pushNamed(context, actionValue)
const announcements = mysqlTable('announcements', {
  id:          int('id').primaryKey().autoincrement(),
  title:       varchar('title', { length: 255 }).notNull(),
  body:        text('body'),
  icon:        varchar('icon', { length: 100 }).notNull().default('campaign'),
  ctaLabel:    varchar('cta_label', { length: 100 }),
  actionType:  varchar('action_type', { length: 20 }).notNull().default('none'),
  actionValue: varchar('action_value', { length: 1000 }),
  active:      boolean('active').notNull().default(true),
  startsAt:    datetime('starts_at'),
  endsAt:      datetime('ends_at'),
  createdAt:   datetime('created_at').notNull().default(new Date()),
  updatedAt:   datetime('updated_at').notNull().default(new Date()),
});

// ─── EVENT CONFIG ───────────────────────────────────────────────────────────
// Singleton row (enforced at the controller layer — we always read/write
// id=1) that the mobile app queries for the dynamic countdown. Kept as a
// regular table rather than a KV so future per-event fields (hero image,
// colour accent) can live in the same row.
const eventConfig = mysqlTable('event_config', {
  id:              int('id').primaryKey(),
  countdownTitle:  varchar('countdown_title', { length: 255 }).notNull().default('Samastha Centenary'),
  countdownTarget: datetime('countdown_target').notNull(),
  updatedAt:       datetime('updated_at').notNull().default(new Date()),
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
  postViews,
  postViewsRelations,
  tasks,
  announcements,
  eventConfig,
};
