const pool = require("../db");
const { logOperation } = require("../utils/auditLog");

/**
 * Transfer Controller
 * Handles all inventory transfer operations:
 * - Between different warehouses
 * - Between locations within same warehouse
 * - Between locations across warehouses
 */

// Validate transfer prerequisites
const validateTransfer = async (productId, fromLocation, toLocation, quantity) => {
    // Verify product exists
    const productResult = await pool.query(
        "SELECT product_id FROM products WHERE product_id = $1",
        [productId]
    );
    if (productResult.rows.length === 0) {
        throw new Error("Product not found");
    }

    // Check if stock available at source location
    const stockResult = await pool.query(
        `SELECT i.quantity 
        FROM inventory i 
        WHERE i.product_id = $1 AND i.warehouse_id = $2`,
        [productId, fromLocation]
    );

    const availableStock = stockResult.rows[0]?.quantity || 0;
    if (availableStock < quantity) {
        throw new Error(`Insufficient stock. Available: ${availableStock}`);
    }

    return availableStock;
};

/**
 * Get all transfers with detailed information
 * Supports filtering by status and warehouse
 */
const getAllTransfers = async (req, res) => {
    try {
        const { status, warehouse_id } = req.query;
        let query = `
            SELECT 
                t.transfer_id,
                p.product_id,
                p.name as product_name,
                p.sku,
                w1.warehouse_id as from_warehouse_id,
                w1.name as from_warehouse,
                w1.short_code as from_warehouse_code,
                w2.warehouse_id as to_warehouse_id,
                w2.name as to_warehouse,
                w2.short_code as to_warehouse_code,
                t.quantity,
                t.status,
                u.user_id as user_id,
                u.name as transferred_by,
                t.transferred_at
            FROM transfers t
            JOIN products p ON t.product_id = p.product_id
            JOIN warehouses w1 ON t.from_warehouse = w1.warehouse_id
            JOIN warehouses w2 ON t.to_warehouse = w2.warehouse_id
            JOIN users u ON t.transferred_by = u.user_id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            params.push(status);
            query += ` AND t.status = $${params.length}`;
        }

        if (warehouse_id) {
            params.push(warehouse_id);
            query += ` AND (t.from_warehouse = $${params.length} OR t.to_warehouse = $${params.length})`;
        }

        query += ` ORDER BY t.transferred_at DESC`;

        const result = await pool.query(query, params);
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
    } catch (err) {
        console.error("Error fetching transfers:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Get single transfer details
 */
const getTransfer = async (req, res) => {
    try {
        const { transfer_id } = req.params;

        const result = await pool.query(
            `SELECT 
                t.transfer_id,
                p.product_id,
                p.name as product_name,
                p.sku,
                w1.warehouse_id as from_warehouse_id,
                w1.name as from_warehouse,
                w1.short_code as from_warehouse_code,
                w2.warehouse_id as to_warehouse_id,
                w2.name as to_warehouse,
                w2.short_code as to_warehouse_code,
                t.quantity,
                t.status,
                u.name as transferred_by,
                t.transferred_at
            FROM transfers t
            JOIN products p ON t.product_id = p.product_id
            JOIN warehouses w1 ON t.from_warehouse = w1.warehouse_id
            JOIN warehouses w2 ON t.to_warehouse = w2.warehouse_id
            JOIN users u ON t.transferred_by = u.user_id
            WHERE t.transfer_id = $1`,
            [transfer_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: "Transfer not found" });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error("Error fetching transfer:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Create a new transfer (warehouse to warehouse or location to location)
 * Automatically updates inventory after creation
 */
const createTransfer = async (req, res) => {
    const client = await pool.connect();
    try {
        const { product_id, from_warehouse, to_warehouse, quantity, notes } = req.body;
        const userId = req.user.id;

        // Validate input
        if (!product_id || !from_warehouse || !to_warehouse || !quantity) {
            return res.status(400).json({ success: false, error: "Missing required fields" });
        }

        if (parseInt(quantity) <= 0) {
            return res.status(400).json({ success: false, error: "Quantity must be greater than 0" });
        }

        if (from_warehouse === to_warehouse) {
            return res.status(400).json({ success: false, error: "Source and destination must be different" });
        }

        // Validate transfer prerequisites
        await validateTransfer(product_id, from_warehouse, to_warehouse, quantity);

        // Start transaction
        await client.query("BEGIN");

        // Create transfer record
        const transferResult = await client.query(
            `INSERT INTO transfers (product_id, from_warehouse, to_warehouse, quantity, transferred_by, status) 
            VALUES ($1, $2, $3, $4, $5, 'completed') 
            RETURNING *`,
            [product_id, from_warehouse, to_warehouse, quantity, userId]
        );

        const transferId = transferResult.rows[0].transfer_id;

        // Update source warehouse inventory (decrease)
        await client.query(
            `UPDATE inventory 
            SET quantity = quantity - $1 
            WHERE product_id = $2 AND warehouse_id = $3`,
            [quantity, product_id, from_warehouse]
        );

        // Update destination warehouse inventory (increase or insert)
        await client.query(
            `INSERT INTO inventory (product_id, warehouse_id, quantity) 
            VALUES ($1, $2, $3) 
            ON CONFLICT (product_id, warehouse_id) 
            DO UPDATE SET quantity = inventory.quantity + $3`,
            [product_id, to_warehouse, quantity]
        );

        // Log to stock ledger
        await client.query(
            `INSERT INTO stock_ledger (product_id, warehouse_id, operation_type, quantity, reference_id) 
            VALUES ($1, $2, 'TRANSFER', $3, $4)`,
            [product_id, from_warehouse, -quantity, transferId]
        );

        await client.query(
            `INSERT INTO stock_ledger (product_id, warehouse_id, operation_type, quantity, reference_id) 
            VALUES ($1, $2, 'TRANSFER', $3, $4)`,
            [product_id, to_warehouse, quantity, transferId]
        );

        // Log operation
        await logOperation(userId, 'TRANSFER_COMPLETED', {
            transfer_id: transferId,
            product_id,
            from_warehouse,
            to_warehouse,
            quantity,
            notes
        }, transferId);

        await client.query("COMMIT");

        res.status(201).json({
            success: true,
            message: "Transfer completed successfully",
            transfer: transferResult.rows[0]
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Error creating transfer:", err.message);
        res.status(400).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
};

/**
 * Get transfer history for analytics and reporting
 */
const getTransferHistory = async (req, res) => {
    try {
        const { product_id, warehouse_id, limit = 100, offset = 0 } = req.query;

        let query = `
            SELECT 
                t.transfer_id,
                p.name as product_name,
                w1.name as from_warehouse,
                w2.name as to_warehouse,
                t.quantity,
                u.name as transferred_by,
                t.transferred_at
            FROM transfers t
            JOIN products p ON t.product_id = p.product_id
            JOIN warehouses w1 ON t.from_warehouse = w1.warehouse_id
            JOIN warehouses w2 ON t.to_warehouse = w2.warehouse_id
            JOIN users u ON t.transferred_by = u.user_id
            WHERE 1=1
        `;

        const params = [];

        if (product_id) {
            params.push(product_id);
            query += ` AND t.product_id = $${params.length}`;
        }

        if (warehouse_id) {
            params.push(warehouse_id);
            query += ` AND (t.from_warehouse = $${params.length} OR t.to_warehouse = $${params.length})`;
        }

        query += ` ORDER BY t.transferred_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error("Error fetching transfer history:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Get transfer statistics
 */
const getTransferStats = async (req, res) => {
    try {
        const { warehouse_id } = req.query;

        let query = `
            SELECT 
                COUNT(*) as total_transfers,
                SUM(t.quantity) as total_quantity_transferred,
                COUNT(DISTINCT t.product_id) as unique_products
            FROM transfers t
            WHERE 1=1
        `;

        const params = [];

        if (warehouse_id) {
            params.push(warehouse_id);
            query += ` AND (t.from_warehouse = $${params.length} OR t.to_warehouse = $${params.length})`;
        }

        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error("Error fetching transfer stats:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = {
    getAllTransfers,
    getTransfer,
    createTransfer,
    getTransferHistory,
    getTransferStats,
    validateTransfer
};
