const express = require("express");
const router = express.Router();
const { handleQuery } = require("../controllers/queryController");

// POST /api/query
router.post("/query", handleQuery);

module.exports = router;