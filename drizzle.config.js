const { defineConfig } = require("drizzle-kit");

module.exports = defineConfig({
  schema: "./src/common/schema.js",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: "samastha",
    database: "samastha_centenary",
  },
});