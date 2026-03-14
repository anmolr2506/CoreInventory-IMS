const router = require("express").Router();
const authorizeToken = require("../middleware/authMiddleware");
const requireApprovedUser = require("../middleware/requireApprovedUser");
const { checkRole } = require("../middleware/roleAuthorization");
const approvalController = require("../controllers/approvalController");

/**
 * Approval Workflow Routes
 * All routes require authentication and appropriate role
 */

// Get all pending approvals (managers and admins only)
router.get(
    "/pending",
    authorizeToken,
    requireApprovedUser,
    checkRole(['manager', 'admin']),
    approvalController.getPendingApprovals
);

// Approve receipt
router.post(
    "/receipt/:receipt_id/approve",
    authorizeToken,
    requireApprovedUser,
    checkRole(['manager', 'admin']),
    approvalController.approveReceipt
);

// Reject receipt
router.post(
    "/receipt/:receipt_id/reject",
    authorizeToken,
    requireApprovedUser,
    checkRole(['manager', 'admin']),
    approvalController.rejectReceipt
);

// Approve delivery
router.post(
    "/delivery/:delivery_id/approve",
    authorizeToken,
    requireApprovedUser,
    checkRole(['manager', 'admin']),
    approvalController.approveDelivery
);

// Reject delivery
router.post(
    "/delivery/:delivery_id/reject",
    authorizeToken,
    requireApprovedUser,
    checkRole(['manager', 'admin']),
    approvalController.rejectDelivery
);

// Approve transfer
router.post(
    "/transfer/:transfer_id/approve",
    authorizeToken,
    requireApprovedUser,
    checkRole(['manager', 'admin']),
    approvalController.approveTransfer
);

module.exports = router;
