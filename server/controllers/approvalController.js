const pool = require("../db");
const { logOperation } = require("../utils/auditLog");

/**
 * Approval Workflow Controller
 * Handles approval for receipts, deliveries, and transfers
 * Based on role-based access:
 * - Managers can approve receipts and deliveries
 * - Admins can approve all requests
 * - Staff can request but not approve
 */

// Get all pending approvals for manager/admin
const getPendingApprovals = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user role to filter appropriately
        const userResult = await pool.query(
            "SELECT role FROM users WHERE user_id = $1",
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json("User not found");
        }

        const userRole = userResult.rows[0].role;

        // Only managers and admins can see approval requests
        if (!['manager', 'admin'].includes(userRole)) {
            return res.status(403).json("Only managers and admins can view approvals");
        }

        const approvals = await pool.query(`
            SELECT 
                'receipt' as request_type,
                r.receipt_id as id,
                p.name as product_name,
                r.quantity,
                w.name as warehouse_name,
                r.status,
                r.received_at as created_at,
                u.name as requested_by
            FROM receipts r
            JOIN products p ON r.product_id = p.product_id
            JOIN warehouses w ON r.warehouse_id = w.warehouse_id
            JOIN users u ON r.received_by = u.user_id
            WHERE r.status = 'pending'

            UNION ALL

            SELECT 
                'delivery' as request_type,
                d.delivery_id as id,
                p.name as product_name,
                d.quantity,
                w.name as warehouse_name,
                d.status,
                d.delivered_at as created_at,
                u.name as requested_by
            FROM deliveries d
            JOIN products p ON d.product_id = p.product_id
            JOIN warehouses w ON d.warehouse_id = w.warehouse_id
            JOIN users u ON d.delivered_by = u.user_id
            WHERE d.status = 'pending'

            UNION ALL

            SELECT 
                'transfer' as request_type,
                t.transfer_id as id,
                p.name as product_name,
                t.quantity,
                CONCAT(w1.name, ' → ', w2.name) as warehouse_name,
                t.status,
                t.transferred_at as created_at,
                u.name as requested_by
            FROM transfers t
            JOIN products p ON t.product_id = p.product_id
            JOIN warehouses w1 ON t.from_warehouse = w1.warehouse_id
            JOIN warehouses w2 ON t.to_warehouse = w2.warehouse_id
            JOIN users u ON t.transferred_by = u.user_id
            WHERE t.status = 'pending'

            ORDER BY created_at DESC
        `);

        res.json(approvals.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
};

// Approve a receipt
const approveReceipt = async (req, res) => {
    try {
        const { receipt_id } = req.params;
        const { approval_notes } = req.body;
        const userId = req.user.id;

        // Verify user is manager or admin
        const userResult = await pool.query(
            "SELECT role FROM users WHERE user_id = $1",
            [userId]
        );

        if (userResult.rows.length === 0 || !['manager', 'admin'].includes(userResult.rows[0].role)) {
            return res.status(403).json("Only managers can approve receipts");
        }

        // Get receipt details
        const receiptResult = await pool.query(
            "SELECT * FROM receipts WHERE receipt_id = $1",
            [receipt_id]
        );

        if (receiptResult.rows.length === 0) {
            return res.status(404).json("Receipt not found");
        }

        const receipt = receiptResult.rows[0];

        if (receipt.status !== 'pending') {
            return res.status(400).json(`Receipt status is ${receipt.status}, cannot approve`);
        }

        // Update receipt status
        await pool.query(
            "UPDATE receipts SET status = 'approved' WHERE receipt_id = $1",
            [receipt_id]
        );

        // Update inventory - ADD to warehouse stock
        await pool.query(
            `UPDATE inventory 
            SET quantity = quantity + $1, last_updated = NOW() 
            WHERE product_id = $2 AND warehouse_id = $3`,
            [receipt.quantity, receipt.product_id, receipt.warehouse_id]
        );

        // Log the operation
        await logOperation(userId, 'RECEIPT', {
            receipt_id,
            product_id: receipt.product_id,
            warehouse_id: receipt.warehouse_id,
            quantity: receipt.quantity,
            approval_notes
        }, receipt_id);

        res.json({ message: "Receipt approved successfully", receipt_id });
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
};

// Reject a receipt
const rejectReceipt = async (req, res) => {
    try {
        const { receipt_id } = req.params;
        const { rejection_reason } = req.body;
        const userId = req.user.id;

        // Verify user is manager or admin
        const userResult = await pool.query(
            "SELECT role FROM users WHERE user_id = $1",
            [userId]
        );

        if (userResult.rows.length === 0 || !['manager', 'admin'].includes(userResult.rows[0].role)) {
            return res.status(403).json("Only managers can reject receipts");
        }

        // Get receipt details
        const receiptResult = await pool.query(
            "SELECT * FROM receipts WHERE receipt_id = $1",
            [receipt_id]
        );

        if (receiptResult.rows.length === 0) {
            return res.status(404).json("Receipt not found");
        }

        // Update receipt status
        await pool.query(
            "UPDATE receipts SET status = 'rejected' WHERE receipt_id = $1",
            [receipt_id]
        );

        // Log the rejection
        await logOperation(userId, 'RECEIPT_REJECTED', {
            receipt_id,
            rejection_reason
        }, receipt_id);

        res.json({ message: "Receipt rejected", receipt_id });
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
};

// Approve a delivery
const approveDelivery = async (req, res) => {
    try {
        const { delivery_id } = req.params;
        const { approval_notes } = req.body;
        const userId = req.user.id;

        // Verify user is manager or admin
        const userResult = await pool.query(
            "SELECT role FROM users WHERE user_id = $1",
            [userId]
        );

        if (userResult.rows.length === 0 || !['manager', 'admin'].includes(userResult.rows[0].role)) {
            return res.status(403).json("Only managers can approve deliveries");
        }

        // Get delivery details
        const deliveryResult = await pool.query(
            "SELECT * FROM deliveries WHERE delivery_id = $1",
            [delivery_id]
        );

        if (deliveryResult.rows.length === 0) {
            return res.status(404).json("Delivery not found");
        }

        const delivery = deliveryResult.rows[0];

        if (delivery.status !== 'pending') {
            return res.status(400).json(`Delivery status is ${delivery.status}, cannot approve`);
        }

        // Update delivery status
        await pool.query(
            "UPDATE deliveries SET status = 'approved' WHERE delivery_id = $1",
            [delivery_id]
        );

        // Update inventory - SUBTRACT from warehouse stock
        const inventoryResult = await pool.query(
            `UPDATE inventory 
            SET quantity = CASE 
                WHEN quantity >= $1 THEN quantity - $1 
                ELSE 0 
            END, 
            last_updated = NOW() 
            WHERE product_id = $2 AND warehouse_id = $3
            RETURNING quantity`,
            [delivery.quantity, delivery.product_id, delivery.warehouse_id]
        );

        // Log the operation
        await logOperation(userId, 'DELIVERY', {
            delivery_id,
            product_id: delivery.product_id,
            warehouse_id: delivery.warehouse_id,
            quantity: delivery.quantity,
            customer_name: delivery.customer_name,
            approval_notes
        }, delivery_id);

        res.json({ 
            message: "Delivery approved successfully", 
            delivery_id,
            remaining_quantity: inventoryResult.rows[0]?.quantity || 0
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
};

// Reject a delivery
const rejectDelivery = async (req, res) => {
    try {
        const { delivery_id } = req.params;
        const { rejection_reason } = req.body;
        const userId = req.user.id;

        // Verify user is manager or admin
        const userResult = await pool.query(
            "SELECT role FROM users WHERE user_id = $1",
            [userId]
        );

        if (userResult.rows.length === 0 || !['manager', 'admin'].includes(userResult.rows[0].role)) {
            return res.status(403).json("Only managers can reject deliveries");
        }

        // Get delivery details
        const deliveryResult = await pool.query(
            "SELECT * FROM deliveries WHERE delivery_id = $1",
            [delivery_id]
        );

        if (deliveryResult.rows.length === 0) {
            return res.status(404).json("Delivery not found");
        }

        // Update delivery status
        await pool.query(
            "UPDATE deliveries SET status = 'rejected' WHERE delivery_id = $1",
            [delivery_id]
        );

        // Log the rejection
        await logOperation(userId, 'DELIVERY_REJECTED', {
            delivery_id,
            rejection_reason
        }, delivery_id);

        res.json({ message: "Delivery rejected", delivery_id });
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
};

// Approve a transfer
const approveTransfer = async (req, res) => {
    try {
        const { transfer_id } = req.params;
        const { approval_notes } = req.body;
        const userId = req.user.id;

        // Verify user is manager or admin
        const userResult = await pool.query(
            "SELECT role FROM users WHERE user_id = $1",
            [userId]
        );

        if (userResult.rows.length === 0 || !['manager', 'admin'].includes(userResult.rows[0].role)) {
            return res.status(403).json("Only managers can approve transfers");
        }

        // Get transfer details
        const transferResult = await pool.query(
            "SELECT * FROM transfers WHERE transfer_id = $1",
            [transfer_id]
        );

        if (transferResult.rows.length === 0) {
            return res.status(404).json("Transfer not found");
        }

        const transfer = transferResult.rows[0];

        if (transfer.status !== 'pending') {
            return res.status(400).json(`Transfer status is ${transfer.status}, cannot approve`);
        }

        // Update transfer status
        await pool.query(
            "UPDATE transfers SET status = 'approved' WHERE transfer_id = $1",
            [transfer_id]
        );

        // Update inventory - decrease from source, increase to destination
        await pool.query(
            `UPDATE inventory 
            SET quantity = GREATEST(0, quantity - $1), last_updated = NOW() 
            WHERE product_id = $2 AND warehouse_id = $3`,
            [transfer.quantity, transfer.product_id, transfer.from_warehouse]
        );

        await pool.query(
            `UPDATE inventory 
            SET quantity = quantity + $1, last_updated = NOW() 
            WHERE product_id = $2 AND warehouse_id = $3`,
            [transfer.quantity, transfer.product_id, transfer.to_warehouse]
        );

        // Log the operation
        await logOperation(userId, 'TRANSFER', {
            transfer_id,
            product_id: transfer.product_id,
            from_warehouse: transfer.from_warehouse,
            to_warehouse: transfer.to_warehouse,
            quantity: transfer.quantity,
            approval_notes
        }, transfer_id);

        res.json({ message: "Transfer approved successfully", transfer_id });
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
};

module.exports = {
    getPendingApprovals,
    approveReceipt,
    rejectReceipt,
    approveDelivery,
    rejectDelivery,
    approveTransfer
};
