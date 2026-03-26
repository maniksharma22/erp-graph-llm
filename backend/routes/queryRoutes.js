const express = require("express");
const router = express.Router();

const { handleQuery } = require("../controllers/queryController");

router.post("/query", handleQuery);

module.exports = router;