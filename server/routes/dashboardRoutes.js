const express = require("express");
const router = express.Router();
const authorize = require("../middleware/authMiddleware");
const requireApprovedUser = require("../middleware/requireApprovedUser");
const { getUserProfile, getDashboardStats } = require("../controllers/dashboardController");

router.get("/dashboard/user", authorize, requireApprovedUser, getUserProfile);
router.get("/dashboard/stats", authorize, requireApprovedUser, getDashboardStats);

module.exports = router;
