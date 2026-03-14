const router = require("express").Router();
const authorizeToken = require("../middleware/authMiddleware");
const { checkRole, checkWarehouseAccess } = require("../middleware/roleAuthorization");
const pool = require("../db");
const { logOperation } = require("../utils/auditLog");

/**
 * Transfer Routes with Role-Based Access Control
 * 
 * STAFF: Can create transfer requests from their assigned warehouse
 * MANAGERS: Can approve transfers
 * ADMIN: Full access
 */

// Create a transfer request (staff only) - PENDING approval
router.post("/transfer", authorizeToken, checkRole('staff'), async (req, res) => {
    try {
        const { product_id, from_warehouse, to_warehouse, quantity } = req.body;
        const userId = req.user.id;

        // Validate input
        if (!product_id || !from_warehouse || !to_warehouse || !quantity) {
            return res.status(400).json("Missing required fields");
        }

        if (from_warehouse === to_warehouse) {
            return res.status(400).json("Cannot transfer to the same warehouse");
        }

        // Verify staff has access to source warehouse
        const warehouseCheck = await pool.query(
            "SELECT warehouse_id FROM warehouse_assignments WHERE user_id = $1 AND warehouse_id = $2",
            [userId, from_warehouse]
        );

        if (warehouseCheck.rows.length === 0) {
            return res.status(403).json("You don't have access to transfer from this warehouse");
        }

        // Check if stock available in source warehouse
        const stockResult = await pool.query(
            "SELECT quantity FROM inventory WHERE product_id = $1 AND warehouse_id = $2",
            [product_id, from_warehouse]
        );

        if (stockResult.rows.length === 0 || stockResult.rows[0].quantity < quantity) {
            const available = stockResult.rows?.[0]?.quantity || 0;
            return res.status(400).json(`Insufficient stock. Available: ${available}`);
        }

        // Create transfer with PENDING status (needs manager approval)
        const result = await pool.query(
            `INSERT INTO transfers (product_id, from_warehouse, to_warehouse, quantity, transferred_by, status) 
            VALUES ($1, $2, $3, $4, $5, 'pending') 
            RETURNING *`,
            [product_id, from_warehouse, to_warehouse, quantity, userId]
        );

        await logOperation(userId, 'TRANSFER_REQUESTED', {
            transfer_id: result.rows[0].transfer_id,
            product_id,
            from_warehouse,
            to_warehouse,
            quantity,
            requested_by: userId
        }, result.rows[0].transfer_id);

        res.status(201).json({
            message: "Transfer request created successfully (Pending approval)",
            transfer: result.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});

// Get all active transfers (managers and admins only)
router.get("/transfer/active", authorizeToken, checkRole(['manager', 'admin']), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                t.transfer_id,
                p.name as product_name,
                w1.name as from_warehouse,
                w2.name as to_warehouse,
                t.quantity,
                t.status,
                u.name as requested_by,
                t.transferred_at
            FROM transfers t
            JOIN products p ON t.product_id = p.product_id
            JOIN warehouses w1 ON t.from_warehouse = w1.warehouse_id
            JOIN warehouses w2 ON t.to_warehouse = w2.warehouse_id
            JOIN users u ON t.transferred_by = u.user_id
            WHERE t.status IN ('pending', 'approved')
            ORDER BY t.transferred_at DESC
        `);

        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});

// Get transfer history for staff (their warehouse transfers only)
router.get("/transfer/history", authorizeToken, async (req, res) => {
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
                    t.transfer_id,
                    p.name as product_name,
                    w1.name as from_warehouse,
                    w2.name as to_warehouse,
                    t.quantity,
                    t.status,
                    u.name as requested_by,
                    t.transferred_at
                FROM transfers t
                JOIN products p ON t.product_id = p.product_id
                JOIN warehouses w1 ON t.from_warehouse = w1.warehouse_id
                JOIN warehouses w2 ON t.to_warehouse = w2.warehouse_id
                JOIN users u ON t.transferred_by = u.user_id
                ORDER BY t.transferred_at DESC
                LIMIT 100
            `;
            params = [];
        } else {
            query = `
                SELECT 
                    t.transfer_id,
                    p.name as product_name,
                    w1.name as from_warehouse,
                    w2.name as to_warehouse,
                    t.quantity,
                    t.status,
                    u.name as requested_by,
                    t.transferred_at
                FROM transfers t
                JOIN products p ON t.product_id = p.product_id
                JOIN warehouses w1 ON t.from_warehouse = w1.warehouse_id
                JOIN warehouses w2 ON t.to_warehouse = w2.warehouse_id
                JOIN users u ON t.transferred_by = u.user_id
                WHERE t.transferred_by = $1 OR t.transferred_at >= NOW() - INTERVAL '30 days'
                ORDER BY t.transferred_at DESC
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

// Perform warehouse operations (picking, shelving, counting) - Staff only
router.post("/warehouse-operation", authorizeToken, checkRole('staff'), async (req, res) => {
    try {
        const { operation_type, product_id, warehouse_id, quantity, notes } = req.body;
        const userId = req.user.id;

        const validOperations = ['picking', 'shelving', 'counting'];
        if (!validOperations.includes(operation_type)) {
            return res.status(400).json(`Invalid operation type. Must be one of: ${validOperations.join(', ')}`);
        }

        // Verify staff has access to warehouse
        const warehouseCheck = await pool.query(
            "SELECT warehouse_id FROM warehouse_assignments WHERE user_id = $1 AND warehouse_id = $2",
            [userId, warehouse_id]
        );

        if (warehouseCheck.rows.length === 0) {
            return res.status(403).json("You don't have access to this warehouse");
        }

        // Log the warehouse operation
        await logOperation(userId, operation_type.toUpperCase(), {
            product_id,
            warehouse_id,
            quantity,
            notes,
            performed_by: userId
        }, null);

        res.json({
            message: `${operation_type} operation logged successfully`,
            operation: {
                type: operation_type,
                product_id,
                warehouse_id,
                quantity,
                performed_by: userId,
                timestamp: new Date().toISOString()
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});

// Get warehouse operations log (staff views their warehouse, managers/admins see all)
router.get("/warehouse-operations", authorizeToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { warehouse_id, days = 7 } = req.query;

        // Get user role
        const userResult = await pool.query(
            "SELECT role FROM users WHERE user_id = $1",
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json("User not found");
        }

        const userRole = userResult.rows[0].role;

        // Build query based on role and filters
        let query = `
            SELECT 
                sl.ledger_id,
                sl.operation_type,
                p.name as product_name,
                w.name as warehouse_name,
                sl.quantity,
                sl.created_at
            FROM stock_ledger sl
            JOIN products p ON sl.product_id = p.product_id
            JOIN warehouses w ON sl.warehouse_id = w.warehouse_id
            WHERE sl.operation_type IN ('PICKING', 'SHELVING', 'COUNTING')
            AND sl.created_at >= NOW() - INTERVAL '${parseInt(days)} days'
        `;

        if (userRole === 'staff') {
            query += ` 
                AND w.warehouse_id IN (
                    SELECT warehouse_id FROM warehouse_assignments WHERE user_id = $1
                )
            `;
        } else if (warehouse_id) {
            query += ` AND w.warehouse_id = $1`;
        }

        query += ` ORDER BY sl.created_at DESC LIMIT 200`;

        const params = warehouse_id && userRole !== 'staff' ? [warehouse_id] : 
                       userRole === 'staff' ? [userId] : [];

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});

module.exports = router;
