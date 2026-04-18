require('dotenv').config();
const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
const schema = require('./schema');

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
});

(async () => {
  try {
    await pool.query(
      "CREATE TABLE IF NOT EXISTS `authors` (" +
        "`id` int AUTO_INCREMENT NOT NULL," +
        "`name` varchar(255) NOT NULL," +
        "`position` varchar(255) NOT NULL," +
        "`dp` varchar(1000)," +
        "`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP," +
        "`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP," +
        "PRIMARY KEY (`id`)," +
        "UNIQUE KEY `uniq_author` (`name`,`position`)" +
        ")",
    );
  } catch (e) {
    console.error('[DB] Failed to ensure authors table exists:', e);
  }
})();

const db = drizzle(pool, { schema, mode: 'default' });

module.exports = db;
