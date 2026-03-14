const express = require("express");
const router = express.Router();
const authorize = require("../middleware/authMiddleware");
const { listReceipts, getReceiptStatusCounts, getDropdowns, validateReceipt, generateReceipt } = require("../controllers/receiptController");

router.get("/api/receipts", authorize, listReceipts);
router.get("/api/receipts/status-counts", authorize, getReceiptStatusCounts);
router.get("/api/receipts/dropdowns", authorize, getDropdowns);
router.post("/api/receipts/validate", authorize, validateReceipt);
router.post("/api/receipts/generate", authorize, generateReceipt);

module.exports = router;
