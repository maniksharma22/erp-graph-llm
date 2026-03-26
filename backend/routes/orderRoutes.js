const express = require("express");
const router = express.Router();

const { getOrders, getMissingBilling } = require("../controllers/orderController");

router.get("/orders", getOrders);
router.get("/orders/missing-billing", getMissingBilling);

module.exports = router;