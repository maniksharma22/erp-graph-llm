const express = require("express");
const router = express.Router();

// ✅ Import the controller correctly
const { handleQuery } = require("../controllers/queryController");

// POST /query
router.post("/query", handleQuery);

module.exports = router;