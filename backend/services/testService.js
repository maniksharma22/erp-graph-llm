const pool = require("../config/db");

const getTestMessage = async () => {
  const result = await pool.query("SELECT NOW()");
  return result.rows[0];
};

module.exports = { getTestMessage };