const express = require("express");
const router = express.Router();
const authorize = require("../middleware/authMiddleware");
const requireApprovedUser = require("../middleware/requireApprovedUser");
const { listDeliveries, getDeliveryStatusCounts } = require("../controllers/deliveryController");

router.get("/api/deliveries", authorize, requireApprovedUser, listDeliveries);
router.get("/api/deliveries/status-counts", authorize, requireApprovedUser, getDeliveryStatusCounts);

module.exports = router;
