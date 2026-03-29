const express = require("express");
const router = express.Router();
const pool = require("../config/db"); 

// Example: GET all orders
router.get("/orders", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM orders LIMIT 10");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database query failed" });
  }
});

module.exports = router;