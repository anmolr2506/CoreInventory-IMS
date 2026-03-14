const router = require("express").Router();
const authorizeToken = require("../middleware/authMiddleware");
const requireApprovedUser = require("../middleware/requireApprovedUser");
const { checkRole } = require("../middleware/roleAuthorization");
const {
    getAllTransfers,
    getTransfer,
    createTransfer,
    getTransferHistory,
    getTransferStats
} = require("../controllers/transferController");

/**
 * Transfer Routes with Role-Based Access Control
 * 
 * Handles internal warehouse transfers:
 * - Between different warehouses
 * - Between locations within same warehouse
 * - Between locations across warehouses
 * 
 * MANAGERS: Can create and view transfers
 * STAFF: Can create transfers from their assigned warehouse
 * ADMIN: Full access
 */

// All transfer endpoints require an approved account.
router.use(authorizeToken, requireApprovedUser);

// Get all transfers
router.get("/transfers", async (req, res) => {
    try {
        await getAllTransfers(req, res);
    } catch (err) {
        console.error("Transfer route error:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get transfer by ID
router.get("/transfer/:transfer_id", async (req, res) => {
    try {
        await getTransfer(req, res);
    } catch (err) {
        console.error("Transfer route error:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Create a new transfer
router.post("/transfer", checkRole(['manager', 'admin']), async (req, res) => {
    try {
        await createTransfer(req, res);
    } catch (err) {
        console.error("Transfer route error:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get transfer history with pagination and filtering
router.get("/transfer-history", async (req, res) => {
    try {
        await getTransferHistory(req, res);
    } catch (err) {
        console.error("Transfer route error:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get transfer statistics
router.get("/transfer-stats", async (req, res) => {
    try {
        await getTransferStats(req, res);
    } catch (err) {
        console.error("Transfer route error:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
