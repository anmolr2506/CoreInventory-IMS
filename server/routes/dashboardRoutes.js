const express = require("express");
const router = express.Router();
const authorize = require("../middleware/authMiddleware");
const { getUserProfile, getDashboardStats } = require("../controllers/dashboardController");

router.get("/dashboard/user", authorize, getUserProfile);
router.get("/dashboard/stats", authorize, getDashboardStats);

module.exports = router;
