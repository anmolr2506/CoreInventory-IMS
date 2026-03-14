const pool = require("../db");

const listDeliveries = async (req, res) => {
    try {
        const { search, view = "table", status } = req.query;

        let query = `
            SELECT d.delivery_id, d.product_id, d.warehouse_id, d.customer_name, d.quantity,
                   d.delivered_by, d.delivered_at, d.status,
                   p.name AS product_name, p.sku, p.unit,
                   w.name AS warehouse_name
            FROM deliveries d
            JOIN products p ON d.product_id = p.product_id
            JOIN warehouses w ON d.warehouse_id = w.warehouse_id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (search && search.trim()) {
            query += ` AND (
                p.name ILIKE $${paramIndex} OR
                p.sku ILIKE $${paramIndex} OR
                d.customer_name ILIKE $${paramIndex} OR
                w.name ILIKE $${paramIndex}
            )`;
            params.push(`%${search.trim()}%`);
            paramIndex++;
        }

        if (status && status.trim() && view === "kanban") {
            query += ` AND d.status = $${paramIndex}`;
            params.push(status.trim());
        }

        query += ` ORDER BY d.delivered_at DESC`;

        const result = await pool.query(query, params);
        const deliveries = result.rows;

        if (view === "kanban") {
            const byStatus = {
                Pending: [],
                Processing: [],
                Shipped: [],
                Delivered: []
            };
            deliveries.forEach((d) => {
                const s = d.status || "Delivered";
                if (byStatus[s]) byStatus[s].push(d);
                else byStatus.Delivered.push(d);
            });
            return res.json({ view: "kanban", data: byStatus });
        }

        res.json({ view: "table", data: deliveries });
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
};

const getDeliveryStatusCounts = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT status, COUNT(*) AS count
             FROM deliveries
             GROUP BY status`
        );
        const counts = { Pending: 0, Processing: 0, Shipped: 0, Delivered: 0 };
        result.rows.forEach((r) => {
            counts[r.status] = parseInt(r.count);
        });
        res.json(counts);
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
};

module.exports = {
    listDeliveries,
    getDeliveryStatusCounts
};
