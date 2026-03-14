const pool = require("../db");

const getUserProfile = async (req, res) => {
    try {
        const user = await pool.query(
            "SELECT user_id, name, email, role FROM users WHERE user_id = $1",
            [req.user]
        );

        if (user.rows.length === 0) {
            return res.status(404).json("User not found");
        }

        res.json(user.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
};

const getDashboardStats = async (req, res) => {
    try {
        // Total items in inventory
        const totalItems = await pool.query(
            "SELECT COALESCE(SUM(quantity), 0) AS total FROM inventory"
        );

        // Total operations (stock_ledger count)
        const totalOps = await pool.query(
            "SELECT COUNT(*) AS total FROM stock_ledger"
        );

        // Low stock products (quantity <= reorder_level)
        const lowStock = await pool.query(
            `SELECT COUNT(DISTINCT p.product_id) AS total
             FROM products p
             JOIN inventory i ON p.product_id = i.product_id
             WHERE i.quantity <= p.reorder_level`
        );

        // Out of stock
        const outOfStock = await pool.query(
            `SELECT COUNT(DISTINCT p.product_id) AS total
             FROM products p
             JOIN inventory i ON p.product_id = i.product_id
             WHERE i.quantity = 0`
        );

        // Fulfillment rate (deliveries / total operations * 100)
        const fulfillment = await pool.query(
            `SELECT 
                CASE WHEN COUNT(*) = 0 THEN 100
                ELSE ROUND((COUNT(*) FILTER (WHERE operation_type = 'DELIVERY')::numeric / COUNT(*)) * 100, 1)
                END AS rate
             FROM stock_ledger`
        );

        // Incoming receipts
        const receiptsToReceive = await pool.query(
            "SELECT COUNT(*) AS total FROM receipts WHERE received_at >= NOW() - interval '7 days'"
        );
        const receiptsLate = await pool.query(
            "SELECT COUNT(*) AS total FROM receipts WHERE received_at < NOW() - interval '14 days'"
        );
        const totalReceipts = await pool.query(
            "SELECT COUNT(*) AS total FROM receipts"
        );

        // Outgoing deliveries
        const deliveriesToDeliver = await pool.query(
            "SELECT COUNT(*) AS total FROM deliveries WHERE delivered_at >= NOW() - interval '7 days'"
        );
        const deliveriesLate = await pool.query(
            "SELECT COUNT(*) AS total FROM deliveries WHERE delivered_at < NOW() - interval '14 days'"
        );
        const deliveriesWaiting = await pool.query(
            "SELECT COUNT(*) AS total FROM deliveries WHERE delivered_at >= NOW() - interval '14 days' AND delivered_at < NOW() - interval '7 days'"
        );
        const totalDeliveries = await pool.query(
            "SELECT COUNT(*) AS total FROM deliveries"
        );

        // Category count
        const categories = await pool.query(
            "SELECT COUNT(*) AS total FROM categories"
        );

        // Activity: today, this week, this month
        const activityToday = await pool.query(
            "SELECT COUNT(*) AS total FROM stock_ledger WHERE created_at >= CURRENT_DATE"
        );
        const activityWeek = await pool.query(
            "SELECT COUNT(*) AS total FROM stock_ledger WHERE created_at >= NOW() - interval '7 days'"
        );
        const activityMonth = await pool.query(
            "SELECT COUNT(*) AS total FROM stock_ledger WHERE created_at >= NOW() - interval '30 days'"
        );

        // Pending: approvals (adjustments recent), processing (transfers recent), completed (receipts recent)
        const pendingApprovals = await pool.query(
            "SELECT COUNT(*) AS total FROM stock_adjustments WHERE adjusted_at >= NOW() - interval '7 days'"
        );
        const pendingProcessing = await pool.query(
            "SELECT COUNT(*) AS total FROM transfers WHERE transferred_at >= NOW() - interval '7 days'"
        );
        const pendingCompleted = await pool.query(
            "SELECT COUNT(*) AS total FROM receipts WHERE received_at >= NOW() - interval '30 days'"
        );

        res.json({
            totalItems: parseInt(totalItems.rows[0].total),
            totalOperations: parseInt(totalOps.rows[0].total),
            lowStockCount: parseInt(lowStock.rows[0].total),
            outOfStockCount: parseInt(outOfStock.rows[0].total),
            fulfillmentRate: parseFloat(fulfillment.rows[0].rate),
            incoming: {
                itemsToReceive: parseInt(receiptsToReceive.rows[0].total),
                late: parseInt(receiptsLate.rows[0].total),
                totalOperations: parseInt(totalReceipts.rows[0].total)
            },
            outgoing: {
                itemsToDeliver: parseInt(deliveriesToDeliver.rows[0].total),
                late: parseInt(deliveriesLate.rows[0].total),
                waiting: parseInt(deliveriesWaiting.rows[0].total),
                totalOperations: parseInt(totalDeliveries.rows[0].total)
            },
            stockStatus: {
                categories: parseInt(categories.rows[0].total),
                lowStock: parseInt(lowStock.rows[0].total),
                outOfStock: parseInt(outOfStock.rows[0].total)
            },
            activity: {
                today: parseInt(activityToday.rows[0].total),
                thisWeek: parseInt(activityWeek.rows[0].total),
                thisMonth: parseInt(activityMonth.rows[0].total)
            },
            pending: {
                approvals: parseInt(pendingApprovals.rows[0].total),
                processing: parseInt(pendingProcessing.rows[0].total),
                completed: parseInt(pendingCompleted.rows[0].total)
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
};

module.exports = {
    getUserProfile,
    getDashboardStats
};
