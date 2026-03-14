const router = require("express").Router();
const authorizeToken = require("../middleware/authMiddleware");
const { checkRole, checkWarehouseAccess } = require("../middleware/roleAuthorization");
const {
    getAllInventory,
    getProductInventory,
    getWarehouseInventory,
    createAdjustment,
    getAllAdjustments,
    getAdjustment,
    getInventoryStats,
    getLowStockAlerts
} = require("../controllers/inventoryController");
const pool = require("../db");
const { logOperation } = require("../utils/auditLog");

/**
 * Inventory Routes with Role-Based Access Control
 * 
 * MANAGERS: Can create receipts, deliveries, view all inventory, create adjustments
 * STAFF: Can view their warehouse inventory
 * ADMIN: Full access
 */

// Get all inventory (filtered by warehouse access)
router.get("/inventory", authorizeToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user role and warehouses
        const userResult = await pool.query(
            "SELECT role FROM users WHERE user_id = $1",
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json("User not found");
        }

        const userRole = userResult.rows[0].role;
        let query, params;

        if (userRole === 'admin' || userRole === 'manager') {
            // Managers and admins see all inventory
            query = `
                SELECT 
                    i.inventory_id,
                    p.product_id,
                    p.name as product_name,
                    p.sku,
                    c.name as category,
                    w.warehouse_id,
                    w.name as warehouse_name,
                    i.quantity,
                    p.reorder_level,
                    i.last_updated,
                    CASE WHEN i.quantity <= p.reorder_level THEN true ELSE false END as needs_reorder
                FROM inventory i
                JOIN products p ON i.product_id = p.product_id
                JOIN categories c ON p.category_id = c.category_id
                JOIN warehouses w ON i.warehouse_id = w.warehouse_id
                ORDER BY w.name, p.name
            `;
            params = [];
        } else {
            // Staff only see their assigned warehouse inventory
            query = `
                SELECT 
                    i.inventory_id,
                    p.product_id,
                    p.name as product_name,
                    p.sku,
                    c.name as category,
                    w.warehouse_id,
                    w.name as warehouse_name,
                    i.quantity,
                    p.reorder_level,
                    i.last_updated,
                    CASE WHEN i.quantity <= p.reorder_level THEN true ELSE false END as needs_reorder
                FROM inventory i
                JOIN products p ON i.product_id = p.product_id
                JOIN categories c ON p.category_id = c.category_id
                JOIN warehouses w ON i.warehouse_id = w.warehouse_id
                JOIN warehouse_assignments wa ON w.warehouse_id = wa.warehouse_id
                WHERE wa.user_id = $1
                ORDER BY w.name, p.name
            `;
            params = [userId];
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});

// Get inventory for specific warehouse
router.get("/inventory/warehouse/:warehouse_id", authorizeToken, checkWarehouseAccess, async (req, res) => {
    try {
        const { warehouse_id } = req.params;

        const result = await pool.query(`
            SELECT 
                i.inventory_id,
                p.product_id,
                p.name as product_name,
                p.sku,
                c.name as category,
                i.quantity,
                p.reorder_level,
                i.last_updated
            FROM inventory i
            JOIN products p ON i.product_id = p.product_id
            JOIN categories c ON p.category_id = c.category_id
            WHERE i.warehouse_id = $1
            ORDER BY p.name
        `, [warehouse_id]);

        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});

// Create a receipt (managers and admins only) - PENDING approval
router.post("/inventory/receipt", authorizeToken, checkRole(['manager', 'admin']), async (req, res) => {
    try {
        const { product_id, warehouse_id, supplier_id, quantity } = req.body;
        const userId = req.user.id;

        // Validate input
        if (!product_id || !warehouse_id || !supplier_id || !quantity) {
            return res.status(400).json("Missing required fields");
        }

        // Create receipt with PENDING status (needs manager approval)
        const result = await pool.query(
            `INSERT INTO receipts (product_id, warehouse_id, supplier_id, quantity, received_by, status) 
            VALUES ($1, $2, $3, $4, $5, 'pending') 
            RETURNING *`,
            [product_id, warehouse_id, supplier_id, quantity, userId]
        );

        await logOperation(userId, 'RECEIPT_CREATED', {
            receipt_id: result.rows[0].receipt_id,
            product_id,
            warehouse_id,
            quantity
        }, result.rows[0].receipt_id);

        res.status(201).json({
            message: "Receipt created successfully (Pending approval)",
            receipt: result.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});

// Create a delivery (managers and admins only) - PENDING approval
router.post("/inventory/delivery", authorizeToken, checkRole(['manager', 'admin']), async (req, res) => {
    try {
        const { product_id, warehouse_id, customer_name, quantity } = req.body;
        const userId = req.user.id;

        // Validate input
        if (!product_id || !warehouse_id || !customer_name || !quantity) {
            return res.status(400).json("Missing required fields");
        }

        // Check if stock available
        const stockResult = await pool.query(
            "SELECT quantity FROM inventory WHERE product_id = $1 AND warehouse_id = $2",
            [product_id, warehouse_id]
        );

        if (stockResult.rows.length === 0) {
            return res.status(400).json("Product not found in this warehouse");
        }

        if (stockResult.rows[0].quantity < quantity) {
            return res.status(400).json(`Insufficient stock. Available: ${stockResult.rows[0].quantity}`);
        }

        // Create delivery with PENDING status (needs manager approval)
        const result = await pool.query(
            `INSERT INTO deliveries (product_id, warehouse_id, customer_name, quantity, delivered_by, status) 
            VALUES ($1, $2, $3, $4, $5, 'pending') 
            RETURNING *`,
            [product_id, warehouse_id, customer_name, quantity, userId]
        );

        await logOperation(userId, 'DELIVERY_CREATED', {
            delivery_id: result.rows[0].delivery_id,
            product_id,
            warehouse_id,
            quantity,
            customer_name
        }, result.rows[0].delivery_id);

        res.status(201).json({
            message: "Delivery created successfully (Pending approval)",
            delivery: result.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});

// Get stock adjustments history
router.get("/inventory/adjustments", authorizeToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user role
        const userResult = await pool.query(
            "SELECT role FROM users WHERE user_id = $1",
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json("User not found");
        }

        const userRole = userResult.rows[0].role;
        let query, params;

        if (userRole === 'admin' || userRole === 'manager') {
            query = `
                SELECT 
                    sa.adjustment_id,
                    p.name as product_name,
                    w.name as warehouse_name,
                    sa.adjustment,
                    sa.reason,
                    u.name as adjusted_by,
                    sa.adjusted_at
                FROM stock_adjustments sa
                JOIN products p ON sa.product_id = p.product_id
                JOIN warehouses w ON sa.warehouse_id = w.warehouse_id
                JOIN users u ON sa.adjusted_by = u.user_id
                ORDER BY sa.adjusted_at DESC
                LIMIT 100
            `;
            params = [];
        } else {
            query = `
                SELECT 
                    sa.adjustment_id,
                    p.name as product_name,
                    w.name as warehouse_name,
                    sa.adjustment,
                    sa.reason,
                    u.name as adjusted_by,
                    sa.adjusted_at
                FROM stock_adjustments sa
                JOIN products p ON sa.product_id = p.product_id
                JOIN warehouses w ON sa.warehouse_id = w.warehouse_id
                JOIN users u ON sa.adjusted_by = u.user_id
                JOIN warehouse_assignments wa ON w.warehouse_id = wa.warehouse_id
                WHERE wa.user_id = $1
                ORDER BY sa.adjusted_at DESC
                LIMIT 100
            `;
            params = [userId];
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});

// Get receipt history
router.get("/inventory/receipts", authorizeToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                r.receipt_id,
                p.name as product_name,
                w.name as warehouse_name,
                s.name as supplier_name,
                r.quantity,
                r.status,
                u.name as received_by,
                r.received_at
            FROM receipts r
            JOIN products p ON r.product_id = p.product_id
            JOIN warehouses w ON r.warehouse_id = w.warehouse_id
            JOIN suppliers s ON r.supplier_id = s.supplier_id
            LEFT JOIN users u ON r.received_by = u.user_id
            ORDER BY r.received_at DESC
            LIMIT 100
        `);

        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});

// Get delivery history
router.get("/inventory/deliveries", authorizeToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                d.delivery_id,
                p.name as product_name,
                w.name as warehouse_name,
                d.customer_name,
                d.quantity,
                d.status,
                u.name as delivered_by,
                d.delivered_at
            FROM deliveries d
            JOIN products p ON d.product_id = p.product_id
            JOIN warehouses w ON d.warehouse_id = w.warehouse_id
            LEFT JOIN users u ON d.delivered_by = u.user_id
            ORDER BY d.delivered_at DESC
            LIMIT 100
        `);

        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});

module.exports = router;
