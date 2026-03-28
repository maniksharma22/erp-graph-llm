const express = require("express");
const router = express.Router();
const { getGraph } = require("../controllers/graphController");

router.get("/graph", getGraph);

module.exports = router;
