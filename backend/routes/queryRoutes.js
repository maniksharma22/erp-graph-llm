const express = require("express");
const router = express.Router();
const { handleNaturalQuery } = require("../controllers/queryController");

// POST /api/query
router.post("/query", handleNaturalQuery);

module.exports = router;