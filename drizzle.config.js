const { defineConfig } = require('drizzle-kit');
require('dotenv').config();

module.exports = defineConfig({
  schema: './src/common/schema.js',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
