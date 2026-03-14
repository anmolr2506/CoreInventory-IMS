const pool = require("../db");
const { logOperation } = require("../utils/auditLog");

/**
 * Inventory Controller
 * Handles inventory operations:
 * - Stock adjustments (physical count mismatches)
 * - Inventory counts and reports
 */

/**
 * Get all inventory items across all warehouses
 */
const getAllInventory = async (req, res) => {
    try {
        const { warehouse_id, product_id } = req.query;

        let query = `
            SELECT 
                i.inventory_id,
                i.product_id,
                p.name as product_name,
                p.sku,
                p.reorder_level,
                c.name as category,
                i.warehouse_id,
                w.name as warehouse_name,
                w.short_code as warehouse_code,
                i.quantity,
                CASE 
                    WHEN i.quantity = 0 THEN 'out_of_stock'
                    WHEN i.quantity <= p.reorder_level THEN 'low_stock'
                    ELSE 'in_stock'
                END as status,
                i.last_updated
            FROM inventory i
            JOIN products p ON i.product_id = p.product_id
            JOIN warehouses w ON i.warehouse_id = w.warehouse_id
            LEFT JOIN categories c ON p.category_id = c.category_id
            WHERE 1=1
        `;

        const params = [];

        if (warehouse_id) {
            params.push(warehouse_id);
            query += ` AND i.warehouse_id = $${params.length}`;
        }

        if (product_id) {
            params.push(product_id);
            query += ` AND i.product_id = $${params.length}`;
        }

        query += ` ORDER BY p.name, w.name`;

        const result = await pool.query(query, params);
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
    } catch (err) {
        console.error("Error fetching inventory:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Get inventory for a specific product across all warehouses
 */
const getProductInventory = async (req, res) => {
    try {
        const { product_id } = req.params;

        const result = await pool.query(
            `SELECT 
                i.inventory_id,
                i.product_id,
                p.name as product_name,
                p.sku,
                p.unit,
                w.warehouse_id,
                w.name as warehouse_name,
                i.quantity,
                i.last_updated
            FROM inventory i
            JOIN products p ON i.product_id = p.product_id
            JOIN warehouses w ON i.warehouse_id = w.warehouse_id
            WHERE p.product_id = $1
            ORDER BY w.name`,
            [product_id]
        );

        res.json({
            success: true,
            data: result.rows,
            total_quantity: result.rows.reduce((sum, row) => sum + row.quantity, 0)
        });
    } catch (err) {
        console.error("Error fetching product inventory:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Get inventory for a specific warehouse
 */
const getWarehouseInventory = async (req, res) => {
    try {
        const { warehouse_id } = req.params;

        const result = await pool.query(
            `SELECT 
                i.inventory_id,
                p.product_id,
                p.name as product_name,
                p.sku,
                p.unit,
                p.reorder_level,
                c.name as category,
                i.quantity,
                CASE 
                    WHEN i.quantity = 0 THEN 'out_of_stock'
                    WHEN i.quantity <= p.reorder_level THEN 'low_stock'
                    ELSE 'in_stock'
                END as status,
                i.last_updated
            FROM inventory i
            JOIN products p ON i.product_id = p.product_id
            JOIN warehouses w ON i.warehouse_id = w.warehouse_id
            LEFT JOIN categories c ON p.category_id = c.category_id
            WHERE w.warehouse_id = $1
            ORDER BY p.name`,
            [warehouse_id]
        );

        res.json({
            success: true,
            warehouse_id,
            data: result.rows,
            total_items: result.rows.length,
            total_quantity: result.rows.reduce((sum, row) => sum + row.quantity, 0)
        });
    } catch (err) {
        console.error("Error fetching warehouse inventory:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Create a stock adjustment (fix physical count mismatches)
 * Automatically updates inventory and logs the adjustment
 */
const createAdjustment = async (req, res) => {
    const client = await pool.connect();
    try {
        const { product_id, warehouse_id, counted_quantity, reason } = req.body;
        const userId = req.user.id;

        // Validate input
        if (!product_id || warehouse_id === undefined || counted_quantity === undefined || !reason) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields: product_id, warehouse_id, counted_quantity, reason"
            });
        }

        if (counted_quantity < 0) {
            return res.status(400).json({
                success: false,
                error: "Counted quantity cannot be negative"
            });
        }

        // Get current recorded quantity
        const currentResult = await client.query(
            `SELECT quantity FROM inventory 
            WHERE product_id = $1 AND warehouse_id = $2`,
            [product_id, warehouse_id]
        );

        const recordedQuantity = currentResult.rows[0]?.quantity || 0;
        const adjustment = counted_quantity - recordedQuantity;

        // Start transaction
        await client.query("BEGIN");

        // Update inventory
        if (counted_quantity === 0) {
            // Delete inventory record if count is zero
            await client.query(
                `DELETE FROM inventory WHERE product_id = $1 AND warehouse_id = $2`,
                [product_id, warehouse_id]
            );
        } else {
            await client.query(
                `INSERT INTO inventory (product_id, warehouse_id, quantity) 
                VALUES ($1, $2, $3) 
                ON CONFLICT (product_id, warehouse_id) 
                DO UPDATE SET quantity = $3`,
                [product_id, warehouse_id, counted_quantity]
            );
        }

        // Create adjustment record
        const adjustmentResult = await client.query(
            `INSERT INTO stock_adjustments (product_id, warehouse_id, adjustment, reason, adjusted_by) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING *`,
            [product_id, warehouse_id, adjustment, reason, userId]
        );

        const adjustmentId = adjustmentResult.rows[0].adjustment_id;

        // Log to stock ledger
        await client.query(
            `INSERT INTO stock_ledger (product_id, warehouse_id, operation_type, quantity, reference_id) 
            VALUES ($1, $2, 'ADJUSTMENT', $3, $4)`,
            [product_id, warehouse_id, adjustment, adjustmentId]
        );

        // Log operation
        await logOperation(userId, 'STOCK_ADJUSTED', {
            adjustment_id: adjustmentId,
            product_id,
            warehouse_id,
            recorded_quantity: recordedQuantity,
            counted_quantity,
            adjustment,
            reason
        }, adjustmentId);

        await client.query("COMMIT");

        res.status(201).json({
            success: true,
            message: `Stock adjusted by ${adjustment > 0 ? '+' : ''}${adjustment}`,
            adjustment: adjustmentResult.rows[0]
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Error creating adjustment:", err.message);
        res.status(400).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
};

/**
 * Get all stock adjustments
 */
const getAllAdjustments = async (req, res) => {
    try {
        const { warehouse_id, product_id, limit = 100, offset = 0 } = req.query;

        let query = `
            SELECT 
                a.adjustment_id,
                p.product_id,
                p.name as product_name,
                p.sku,
                w.warehouse_id,
                w.name as warehouse_name,
                a.adjustment,
                a.reason,
                u.name as adjusted_by,
                a.adjusted_at
            FROM stock_adjustments a
            JOIN products p ON a.product_id = p.product_id
            JOIN warehouses w ON a.warehouse_id = w.warehouse_id
            JOIN users u ON a.adjusted_by = u.user_id
            WHERE 1=1
        `;

        const params = [];

        if (warehouse_id) {
            params.push(warehouse_id);
            query += ` AND a.warehouse_id = $${params.length}`;
        }

        if (product_id) {
            params.push(product_id);
            query += ` AND a.product_id = $${params.length}`;
        }

        query += ` ORDER BY a.adjusted_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
    } catch (err) {
        console.error("Error fetching adjustments:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Get adjustment details
 */
const getAdjustment = async (req, res) => {
    try {
        const { adjustment_id } = req.params;

        const result = await pool.query(
            `SELECT 
                a.adjustment_id,
                p.product_id,
                p.name as product_name,
                p.sku,
                w.warehouse_id,
                w.name as warehouse_name,
                a.adjustment,
                a.reason,
                u.name as adjusted_by,
                a.adjusted_at
            FROM stock_adjustments a
            JOIN products p ON a.product_id = p.product_id
            JOIN warehouses w ON a.warehouse_id = w.warehouse_id
            JOIN users u ON a.adjusted_by = u.user_id
            WHERE a.adjustment_id = $1`,
            [adjustment_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: "Adjustment not found" });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error("Error fetching adjustment:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Get inventory statistics and alerts
 */
const getInventoryStats = async (req, res) => {
    try {
        const { warehouse_id } = req.query;

        let warehouseFilter = '';
        const params = [];

        if (warehouse_id) {
            params.push(warehouse_id);
            warehouseFilter = ` WHERE i.warehouse_id = $1`;
        }

        const statsResult = await pool.query(`
            SELECT 
                COUNT(DISTINCT i.product_id) as total_products,
                SUM(i.quantity) as total_stock,
                COUNT(CASE WHEN i.quantity = 0 THEN 1 END) as out_of_stock_count,
                COUNT(CASE WHEN i.quantity <= p.reorder_level THEN 1 END) as low_stock_count
            FROM inventory i
            JOIN products p ON i.product_id = p.product_id
            ${warehouseFilter}
        `, params);

        res.json({
            success: true,
            stats: statsResult.rows[0]
        });
    } catch (err) {
        console.error("Error fetching inventory stats:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Get low stock alerts
 */
const getLowStockAlerts = async (req, res) => {
    try {
        const { warehouse_id } = req.query;

        let query = `
            SELECT 
                p.product_id,
                p.name as product_name,
                p.sku,
                p.reorder_level,
                i.quantity,
                w.warehouse_id,
                w.name as warehouse_name,
                (p.reorder_level - i.quantity) as units_needed
            FROM products p
            JOIN inventory i ON p.product_id = i.product_id
            JOIN warehouses w ON i.warehouse_id = w.warehouse_id
            WHERE i.quantity <= p.reorder_level
        `;

        const params = [];

        if (warehouse_id) {
            params.push(warehouse_id);
            query += ` AND w.warehouse_id = $${params.length}`;
        }

        query += ` ORDER BY (p.reorder_level - i.quantity) DESC`;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows,
            alert_count: result.rows.length
        });
    } catch (err) {
        console.error("Error fetching low stock alerts:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = {
    getAllInventory,
    getProductInventory,
    getWarehouseInventory,
    createAdjustment,
    getAllAdjustments,
    getAdjustment,
    getInventoryStats,
    getLowStockAlerts
};
