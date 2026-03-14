const router = require("express").Router();
const authorizeToken = require("../middleware/authMiddleware");
const requireApprovedUser = require("../middleware/requireApprovedUser");
const { checkRole } = require("../middleware/roleAuthorization");
const { createSupplier } = require("../controllers/supplierController");

// Create or update supplier (manager/admin only)
router.post(
    "/suppliers",
    authorizeToken,
    requireApprovedUser,
    checkRole(["manager", "admin"]),
    createSupplier
);

module.exports = router;

