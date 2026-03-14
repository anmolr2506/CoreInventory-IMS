const express = require("express");
const router = express.Router();
const authorize = require("../middleware/authMiddleware");
const { listDeliveries, getDeliveryStatusCounts } = require("../controllers/deliveryController");

router.get("/api/deliveries", authorize, listDeliveries);
router.get("/api/deliveries/status-counts", authorize, getDeliveryStatusCounts);

module.exports = router;
