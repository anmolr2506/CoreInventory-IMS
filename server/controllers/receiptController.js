const pool = require("../db");

const getDropdowns = async (req, res) => {
    try {
        const [products, suppliers, warehouses, users] = await Promise.all([
            pool.query("SELECT product_id, name, sku, unit FROM products ORDER BY name"),
            pool.query("SELECT supplier_id, name, contact_person, email, phone, address FROM suppliers ORDER BY name"),
            pool.query("SELECT warehouse_id, name, location FROM warehouses ORDER BY name"),
            pool.query("SELECT user_id, name, email FROM users ORDER BY name")
        ]);
        res.json({
            products: products.rows,
            suppliers: suppliers.rows,
            warehouses: warehouses.rows,
            users: users.rows
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server Error" });
    }
};

const validateReceipt = async (req, res) => {
    try {
        const { supplier_id, warehouse_id, lines } = req.body;
        if (!supplier_id || !warehouse_id || !lines || !Array.isArray(lines) || lines.length === 0) {
            return res.status(400).json({ error: "supplier_id, warehouse_id, and at least one product line required" });
        }
        const validated = [];
        let grandTotal = 0;
        for (const line of lines) {
            if (!line.product_id || !line.quantity || line.quantity <= 0) continue;
            const priceRow = await pool.query(
                `SELECT p.product_id, p.name, p.sku, p.unit, COALESCE(sp.price, 0) AS unit_price
                 FROM products p
                 LEFT JOIN supplier_products sp ON p.product_id = sp.product_id AND sp.supplier_id = $1
                 WHERE p.product_id = $2`,
                [supplier_id, line.product_id]
            );
            if (priceRow.rows.length === 0) {
                return res.status(400).json({ error: `Product ${line.product_id} not found` });
            }
            const p = priceRow.rows[0];
            const unitPrice = parseFloat(p.unit_price) || 0;
            const lineTotal = unitPrice * parseInt(line.quantity);
            grandTotal += lineTotal;
            validated.push({
                product_id: p.product_id,
                name: p.name,
                sku: p.sku,
                unit: p.unit,
                quantity: parseInt(line.quantity),
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

const generateReceipt = async (req, res) => {
    try {
        const { supplier_id, warehouse_id, schedule_date, received_by, lines } = req.body;
        if (!supplier_id || !warehouse_id || !lines || !Array.isArray(lines) || lines.length === 0) {
            return res.status(400).json({ error: "supplier_id, warehouse_id, and at least one validated line required" });
        }
        const refResult = await pool.query(
            `SELECT COALESCE(MAX(CAST(SUBSTRING(reference_number FROM 8) AS INT)), 0) + 1 AS next_num
             FROM receipts WHERE reference_number LIKE 'WH/IN/%'`
        );
        const nextNum = refResult.rows[0]?.next_num || 1;
        const referenceNumber = `WH/IN/${String(nextNum).padStart(4, "0")}`;
        const schedDate = schedule_date ? new Date(schedule_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
        const inserted = [];
        for (const line of lines) {
            if (!line.product_id || !line.quantity || line.quantity <= 0) continue;
            const unitPrice = parseFloat(line.unit_price) || 0;
            const ins = await pool.query(
                `INSERT INTO receipts (reference_number, product_id, warehouse_id, supplier_id, quantity, unit_price, received_by, schedule_date, status, received_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Received', CURRENT_TIMESTAMP)
                 RETURNING receipt_id, product_id, quantity, unit_price`,
                [referenceNumber, line.product_id, warehouse_id, supplier_id, line.quantity, unitPrice, received_by || null, schedDate]
            );
            inserted.push({ ...ins.rows[0], name: line.name, sku: line.sku, unit: line.unit });
        }
        const supplierRow = await pool.query("SELECT name, contact_person, email, phone, address FROM suppliers WHERE supplier_id = $1", [supplier_id]);
        const warehouseRow = await pool.query("SELECT name, location FROM warehouses WHERE warehouse_id = $1", [warehouse_id]);
        const userRow = received_by ? await pool.query("SELECT name FROM users WHERE user_id = $1", [received_by]) : null;
        const grandTotal = inserted.reduce((s, l) => s + (l.quantity * (parseFloat(l.unit_price) || 0)), 0);
        res.json({
            reference_number: referenceNumber,
            receipt_ids: inserted.map((r) => r.receipt_id),
            supplier: supplierRow.rows[0] || {},
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

const listReceipts = async (req, res) => {
    try {
        const { search, view = "table", status } = req.query;

        let query = `
            SELECT r.receipt_id, r.reference_number, r.product_id, r.warehouse_id, r.supplier_id, r.quantity,
                   r.unit_price, r.received_by, r.received_at, r.status,
                   p.name AS product_name, p.sku, p.unit,
                   w.name AS warehouse_name,
                   s.name AS supplier_name
            FROM receipts r
            JOIN products p ON r.product_id = p.product_id
            JOIN warehouses w ON r.warehouse_id = w.warehouse_id
            JOIN suppliers s ON r.supplier_id = s.supplier_id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (search && search.trim()) {
            query += ` AND (
                p.name ILIKE $${paramIndex} OR
                p.sku ILIKE $${paramIndex} OR
                s.name ILIKE $${paramIndex} OR
                w.name ILIKE $${paramIndex} OR
                r.reference_number ILIKE $${paramIndex}
            )`;
            params.push(`%${search.trim()}%`);
            paramIndex++;
        }

        if (status && status.trim() && view === "kanban") {
            query += ` AND r.status = $${paramIndex}`;
            params.push(status.trim());
        }

        query += ` ORDER BY r.received_at DESC`;

        const result = await pool.query(query, params);
        const receipts = result.rows;

        if (view === "kanban") {
            const byStatus = {
                Pending: [],
                "In Transit": [],
                Received: []
            };
            receipts.forEach((r) => {
                const s = r.status || "Received";
                if (byStatus[s]) byStatus[s].push(r);
                else byStatus.Received.push(r);
            });
            return res.json({ view: "kanban", data: byStatus });
        }

        res.json({ view: "table", data: receipts });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server Error" });
    }
};

const getReceiptStatusCounts = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT status, COUNT(*) AS count
             FROM receipts
             GROUP BY status`
        );
        const counts = { Pending: 0, "In Transit": 0, Received: 0 };
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
    listReceipts,
    getReceiptStatusCounts,
    getDropdowns,
    validateReceipt,
    generateReceipt
};
