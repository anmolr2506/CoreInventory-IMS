const router = require("express").Router();
const authorizeToken = require("../middleware/authMiddleware");
const { checkRole } = require("../middleware/roleAuthorization");
const warehouseController = require("../controllers/warehouseController");

/**
 * Warehouse Routes
 * Only admins and managers can CRUD warehouses
 */

// Get all warehouses (public - no auth required, used for dropdowns)
router.get("/warehouses", async (req, res) => {
    try {
        const result = await warehouseController.getAllWarehouses(req, res);
        return result;
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});

// Get all warehouses (authenticated)
router.get("/warehouses/list/all", authorizeToken, warehouseController.getAllWarehouses);

// Get warehouse by ID
router.get("/warehouse/:warehouse_id", authorizeToken, warehouseController.getWarehouse);

// Create warehouse (admin/manager only)
router.post("/warehouse", authorizeToken, checkRole(['admin', 'manager']), warehouseController.createWarehouse);

// Update warehouse (admin/manager only)
router.put("/warehouse/:warehouse_id", authorizeToken, checkRole(['admin', 'manager']), warehouseController.updateWarehouse);

// Delete warehouse (admin only)
router.delete("/warehouse/:warehouse_id", authorizeToken, checkRole('admin'), warehouseController.deleteWarehouse);

module.exports = router;
