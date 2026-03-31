
const express = require('express');
const router = express.Router();
const { getGraph, getGraphData } = require("../controllers/graphController");


router.get("/", getGraphData);

module.exports = router;




// const express = require('express');
// const router = express.Router();
// const { getGraph } = require("../controllers/graphController");

// router.get("/graph", getGraph);
// const { getGraphData } = require('../controllers/graphController');

// router.get('/', getGraphData);

// module.exports = router;

