const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false 
  }
});

pool.on("connect", () => {
  console.log("✅ Database Connected Successfully");
});

pool.on("error", (err) => {
  console.error("❌ Database Connection Error:", err);
});

module.exports = pool;