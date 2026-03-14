const pool = require("../db");

/**
 * Lightweight reconciliation checks to detect drift/duplicates.
 * This does not attempt to rebuild inventory; it reports anomalies.
 */
async function getReconciliationReport(req, res) {
    const { days = 30 } = req.query;
    const safeDays = Math.max(1, Math.min(365, Number.parseInt(days, 10) || 30));

    try {
        const duplicates = await pool.query(
            `
            SELECT
                operation_type,
                reference_id,
                product_id,
                warehouse_id,
                COUNT(*) AS row_count
            FROM stock_ledger
            WHERE idempotency_key IS NOT NULL
              AND created_at >= NOW() - ($1 || ' days')::interval
            GROUP BY operation_type, reference_id, product_id, warehouse_id
            HAVING COUNT(*) > 1
            ORDER BY row_count DESC
            LIMIT 200
            `,
            [safeDays]
        );

        const missingInventoryRows = await pool.query(
            `
            SELECT
                sl.product_id,
                sl.warehouse_id,
                COUNT(*) AS ledger_rows
            FROM stock_ledger sl
            LEFT JOIN inventory i
              ON i.product_id = sl.product_id AND i.warehouse_id = sl.warehouse_id
            WHERE i.inventory_id IS NULL
              AND sl.created_at >= NOW() - ($1 || ' days')::interval
            GROUP BY sl.product_id, sl.warehouse_id
            ORDER BY ledger_rows DESC
            LIMIT 200
            `,
            [safeDays]
        );

        res.json({
            success: true,
            window_days: safeDays,
            duplicates: duplicates.rows,
            missing_inventory_rows: missingInventoryRows.rows
        });
    } catch (err) {
        console.error("Ledger reconciliation error:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
}

module.exports = {
    getReconciliationReport
};

