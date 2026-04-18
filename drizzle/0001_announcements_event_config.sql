-- Adds the announcements table (sticky dock content on mobile) and a
-- single-row event_config table (powers the dynamic centenary countdown
-- on mobile). Both are additive — no existing tables are modified.

CREATE TABLE IF NOT EXISTS `announcements` (
  `id`           INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `title`        VARCHAR(255) NOT NULL,
  `body`         TEXT NULL,
  `icon`         VARCHAR(100) NOT NULL DEFAULT 'campaign',
  `cta_label`    VARCHAR(100) NULL,
  `action_type`  VARCHAR(20)  NOT NULL DEFAULT 'none',
  `action_value` VARCHAR(1000) NULL,
  `active`       TINYINT(1)   NOT NULL DEFAULT 1,
  `starts_at`    DATETIME NULL,
  `ends_at`      DATETIME NULL,
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Helps the mobile "which announcement is live right now" query stay fast
-- as the table grows. active first because it has the highest selectivity
-- (most rows are inactive once an announcement has done its job).
CREATE INDEX `idx_announcements_active_window`
  ON `announcements` (`active`, `starts_at`, `ends_at`);

CREATE TABLE IF NOT EXISTS `event_config` (
  `id`               INT NOT NULL PRIMARY KEY,
  `countdown_title`  VARCHAR(255) NOT NULL DEFAULT 'Samastha Centenary',
  `countdown_target` DATETIME NOT NULL,
  `updated_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed the singleton row with the existing hard-coded mobile target so
-- the countdown doesn't jump when the mobile app starts reading from the
-- API. Admins can then pick a new date from the admin panel.
INSERT INTO `event_config` (`id`, `countdown_title`, `countdown_target`)
VALUES (1, 'Samastha Centenary', '2026-05-15 00:00:00')
ON DUPLICATE KEY UPDATE `id` = `id`;
