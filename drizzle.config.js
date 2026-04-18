const { defineConfig } = require("drizzle-kit");
require('dotenv').config();

module.exports = defineConfig({
  schema: "./src/common/schema.js",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: process.env.DATABASE_URL
    ? { url: process.env.DATABASE_URL }
    : {
        host: "127.0.0.1",
        port: 3306,
        user: "root",
        password: "samastha",
        database: "samastha_centenary",
      },
});