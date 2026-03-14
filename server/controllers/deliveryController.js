const pool = require("../db");

const getLatestReceiptUnitPrice = async (productId) => {
    try {
        const result = await pool.query(
            `SELECT unit_price
             FROM receipts
             WHERE product_id = $1 AND unit_price IS NOT NULL
             ORDER BY received_at DESC NULLS LAST, receipt_id DESC
             LIMIT 1`,
            [productId]
        );
        return parseFloat(result.rows[0]?.unit_price) || 0;
    } catch {
        return 0;
    }
};

const getAverageSupplierPrice = async (productId) => {
    try {
        const result = await pool.query(
            `SELECT AVG(price)::NUMERIC(10,2) AS unit_price
             FROM supplier_products
             WHERE product_id = $1`,
            [productId]
        );
        return parseFloat(result.rows[0]?.unit_price) || 0;
    } catch {
        return 0;
    }
};

const getDropdowns = async (req, res) => {
    try {
        const [products, warehouses, users] = await Promise.all([
            pool.query("SELECT product_id, name, sku, unit FROM products ORDER BY name"),
            pool.query("SELECT warehouse_id, name, location FROM warehouses ORDER BY name"),
            pool.query("SELECT user_id, name, email FROM users ORDER BY name")
        ]);
        res.json({
            products: products.rows,
            warehouses: warehouses.rows,
            users: users.rows
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server Error" });
    }
};

const validateDelivery = async (req, res) => {
    try {
        const { customer_name, warehouse_id, lines } = req.body;
        if (!customer_name || !customer_name.trim() || !warehouse_id || !lines || !Array.isArray(lines) || lines.length === 0) {
            return res.status(400).json({ error: "Customer name, warehouse, and at least one product line required" });
        }
        const validated = [];
        let grandTotal = 0;
        for (const line of lines) {
            if (!line.product_id || !line.quantity || line.quantity <= 0) continue;
            const invRow = await pool.query(
                `SELECT COALESCE(i.quantity, 0) AS available,
                        p.name,
                        p.sku,
                        p.unit
                 FROM products p
                 LEFT JOIN inventory i ON p.product_id = i.product_id AND i.warehouse_id = $1
                 WHERE p.product_id = $2`,
                [warehouse_id, line.product_id]
            );
            if (invRow.rows.length === 0) {
                return res.status(400).json({ error: `Product not found` });
            }
            const p = invRow.rows[0];
            const available = parseInt(p.available) || 0;
            const requested = parseInt(line.quantity);
            if (requested > available) {
                return res.status(400).json({
                    error: "Insufficient stock",
                    product: p.name,
                    requested,
                    available,
                    message: `Less quantity available for ${p.name}: only ${available} ${p.unit} available, requested ${requested}`
                });
            }

            let unitPrice = await getLatestReceiptUnitPrice(parseInt(line.product_id));
            if (unitPrice <= 0) {
                unitPrice = await getAverageSupplierPrice(parseInt(line.product_id));
            }

            const lineTotal = unitPrice * requested;
            grandTotal += lineTotal;
            validated.push({
                product_id: parseInt(line.product_id),
                name: p.name,
                sku: p.sku,
                unit: p.unit,
                quantity: requested,
                available,
                unit_price: unitPrice,
                line_total: Math.round(lineTotal * 100) / 100
            });
        }
        res.json({ lines: validated, grand_total: Math.round(grandTotal * 100) / 100 });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server Error" });
    }
};

const generateDelivery = async (req, res) => {
    try {
        const { customer_name, warehouse_id, schedule_date, delivered_by, lines } = req.body;
        if (!customer_name || !customer_name.trim() || !warehouse_id || !lines || !Array.isArray(lines) || lines.length === 0) {
            return res.status(400).json({ error: "Customer name, warehouse, and at least one validated line required" });
        }
        const refResult = await pool.query(
            `SELECT COALESCE(MAX(CAST(SUBSTRING(reference_number FROM 8) AS INT)), 0) + 1 AS next_num
             FROM deliveries WHERE reference_number LIKE 'WH/OUT/%'`
        );
        const nextNum = refResult.rows[0]?.next_num || 1;
        const referenceNumber = `WH/OUT/${String(nextNum).padStart(4, "0")}`;
        const schedDate = schedule_date ? new Date(schedule_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
        const inserted = [];
        for (const line of lines) {
            if (!line.product_id || !line.quantity || line.quantity <= 0) continue;
            const requestedQty = parseInt(line.quantity);
            const invCheck = await pool.query(
                "SELECT quantity FROM inventory WHERE product_id = $1 AND warehouse_id = $2",
                [line.product_id, warehouse_id]
            );
            const available = invCheck.rows[0] ? parseInt(invCheck.rows[0].quantity) || 0 : 0;
            if (available < requestedQty) {
                return res.status(400).json({
                    error: "Insufficient stock",
                    message: `Less quantity available: only ${available} in stock for this product`
                });
            }

            // Fallback price if client sends empty/zero value.
            let unitPrice = parseFloat(line.unit_price);
            if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
                unitPrice = await getLatestReceiptUnitPrice(parseInt(line.product_id));
                if (unitPrice <= 0) {
                    unitPrice = await getAverageSupplierPrice(parseInt(line.product_id));
                }
            }

            const ins = await pool.query(
                `INSERT INTO deliveries (reference_number, product_id, warehouse_id, customer_name, quantity, unit_price, delivered_by, schedule_date, status, delivered_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Delivered', CURRENT_TIMESTAMP)
                 RETURNING delivery_id, product_id, quantity, unit_price`,
                [referenceNumber, line.product_id, warehouse_id, customer_name.trim(), requestedQty, unitPrice, delivered_by || null, schedDate]
            );
            inserted.push({ ...ins.rows[0], name: line.name, sku: line.sku, unit: line.unit });
        }
        const warehouseRow = await pool.query("SELECT name, location FROM warehouses WHERE warehouse_id = $1", [warehouse_id]);
        const userRow = delivered_by ? await pool.query("SELECT name FROM users WHERE user_id = $1", [delivered_by]) : null;
        const grandTotal = inserted.reduce((s, l) => s + (l.quantity * (parseFloat(l.unit_price) || 0)), 0);
        res.json({
            reference_number: referenceNumber,
            delivery_ids: inserted.map((d) => d.delivery_id),
            customer: { name: customer_name.trim() },
            warehouse: warehouseRow.rows[0] || {},
            responsible: userRow?.rows[0]?.name || null,
            schedule_date: schedDate,
            lines: inserted,
            grand_total: Math.round(grandTotal * 100) / 100
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server Error" });
    }
};

const listDeliveries = async (req, res) => {
    try {
        const { search, view = "table", status } = req.query;

        let query = `
            SELECT d.delivery_id, d.reference_number, d.product_id, d.warehouse_id, d.customer_name, d.quantity,
                   d.unit_price, d.delivered_by, d.delivered_at, d.status,
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
                w.name ILIKE $${paramIndex} OR
                d.reference_number ILIKE $${paramIndex}
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
        res.status(500).json({ error: "Server Error" });
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
        res.status(500).json({ error: "Server Error" });
    }
};

module.exports = {
    listDeliveries,
    getDeliveryStatusCounts,
    getDropdowns,
    validateDelivery,
    generateDelivery
};
