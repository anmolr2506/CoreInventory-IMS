const router = require("express").Router();
const authorizeToken = require("../middleware/authMiddleware");
const requireApprovedUser = require("../middleware/requireApprovedUser");
const { checkRole } = require("../middleware/roleAuthorization");
const { getReconciliationReport } = require("../controllers/ledgerController");

// Admin-only reconciliation report
router.get(
    "/ledger/reconcile",
    authorizeToken,
    requireApprovedUser,
    checkRole("admin"),
    getReconciliationReport
);

module.exports = router;

