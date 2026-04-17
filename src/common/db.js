require('dotenv').config();
const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
const schema = require('./schema');

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
});

const db = drizzle(pool, { schema, mode: 'default' });

module.exports = db;
