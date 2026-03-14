const express = require("express");
const router = express.Router();
const authorize = require("../middleware/authMiddleware");
const requireApprovedUser = require("../middleware/requireApprovedUser");
const { listDeliveries, getDeliveryStatusCounts, getDropdowns, validateDelivery, generateDelivery } = require("../controllers/deliveryController");

router.get("/api/deliveries", authorize, requireApprovedUser, listDeliveries);
router.get("/api/deliveries/status-counts", authorize, requireApprovedUser, getDeliveryStatusCounts);
router.get("/api/deliveries/dropdowns", authorize, requireApprovedUser, getDropdowns);
router.post("/api/deliveries/validate", authorize, requireApprovedUser, validateDelivery);
router.post("/api/deliveries/generate", authorize, requireApprovedUser, generateDelivery);

module.exports = router;
