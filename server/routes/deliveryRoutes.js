const express = require("express");
const router = express.Router();
const authorize = require("../middleware/authMiddleware");
const { listDeliveries, getDeliveryStatusCounts, getDropdowns, validateDelivery, generateDelivery } = require("../controllers/deliveryController");

router.get("/api/deliveries", authorize, listDeliveries);
router.get("/api/deliveries/status-counts", authorize, getDeliveryStatusCounts);
router.get("/api/deliveries/dropdowns", authorize, getDropdowns);
router.post("/api/deliveries/validate", authorize, validateDelivery);
router.post("/api/deliveries/generate", authorize, generateDelivery);

module.exports = router;
