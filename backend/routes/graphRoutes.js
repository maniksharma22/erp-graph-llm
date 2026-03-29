const express = require('express');
const router = express.Router();
<<<<<<< HEAD
const { getGraph } = require("../controllers/graphController");

router.get("/graph", getGraph);
=======
const { getGraphData } = require('../controllers/graphController');

router.get('/', getGraphData);
>>>>>>> f8820e3 (updated api url and env settings)

module.exports = router;
