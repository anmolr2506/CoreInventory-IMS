const express = require("express");
const router = express.Router();
const authorize = require("../middleware/authMiddleware");
const requireApprovedUser = require("../middleware/requireApprovedUser");
const { listReceipts, getReceiptStatusCounts, getDropdowns, validateReceipt, generateReceipt } = require("../controllers/receiptController");

router.get("/api/receipts", authorize, requireApprovedUser, listReceipts);
router.get("/api/receipts/status-counts", authorize, requireApprovedUser, getReceiptStatusCounts);
router.get("/api/receipts/dropdowns", authorize, requireApprovedUser, getDropdowns);
router.post("/api/receipts/validate", authorize, requireApprovedUser, validateReceipt);
router.post("/api/receipts/generate", authorize, requireApprovedUser, generateReceipt);

module.exports = router;
