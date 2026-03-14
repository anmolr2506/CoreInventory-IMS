const router = require("express").Router();
const authorizeToken = require("../middleware/authMiddleware");
const { checkRole } = require("../middleware/roleAuthorization");
const {
    getPendingApprovals,
    approveUser,
    rejectUser,
    getUserApprovalStatus,
    getAllUsersWithStatus
} = require("../controllers/approvalUserController");

/**
 * User Approval Routes
 * 
 * Managers: Can approve staff
 * Admins: Can approve managers and staff
 */

// Get user's own approval status
router.get("/user/approval-status", authorizeToken, async (req, res) => {
    try {
        await getUserApprovalStatus(req, res);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get pending approval requests (managers and admins)
router.get("/approvals/pending", authorizeToken, checkRole(['manager', 'admin']), async (req, res) => {
    try {
        await getPendingApprovals(req, res);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Approve a user (managers and admins)
router.post("/approval/:user_id/approve", authorizeToken, checkRole(['manager', 'admin']), async (req, res) => {
    try {
        await approveUser(req, res);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Reject a user (managers and admins)
router.post("/approval/:user_id/reject", authorizeToken, checkRole(['manager', 'admin']), async (req, res) => {
    try {
        await rejectUser(req, res);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get all users with approval status (admin only)
router.get("/users/all", authorizeToken, checkRole('admin'), async (req, res) => {
    try {
        await getAllUsersWithStatus(req, res);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
