const pool = require("../db");

function requireSyncSecret(req) {
    const secret = req.header("x-sync-secret");
    return secret && process.env.SYNC_SECRET && secret === process.env.SYNC_SECRET;
}

async function applyStockMovement(client, payload) {
    // Idempotent ledger insert. Inventory sync is applied as a best-effort delta.
    const {
        operation_type,
        product_id,
        warehouse_id,
        quantity,
        reference_id,
        idempotency_key
    } = payload;

    await client.query(
        `INSERT INTO stock_ledger (product_id, warehouse_id, operation_type, quantity, reference_id, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [product_id, warehouse_id, operation_type, quantity, reference_id, idempotency_key]
    );

    // Apply inventory delta. For DELIVERY, quantity is expected to be positive, but delta is negative.
    // For ADJUSTMENT, quantity may be signed.
    let delta = quantity;
    if (operation_type === "DELIVERY") delta = -Math.abs(quantity);
    if (operation_type === "RECEIPT") delta = Math.abs(quantity);
    // TRANSFER is not handled here (should be emitted as two STOCK_MOVEMENT events externally).

    await client.query(
        `INSERT INTO inventory (product_id, warehouse_id, quantity)
         VALUES ($1, $2, GREATEST(0, $3))
         ON CONFLICT (product_id, warehouse_id)
         DO UPDATE SET quantity = GREATEST(0, inventory.quantity + EXCLUDED.quantity), last_updated = NOW()`,
        [product_id, warehouse_id, delta]
    );
}

async function applyUserApproval(client, payload) {
    const { user_id, approval_status, assigned_role, approved_by, approved_at } = payload;

    // Apply only if still pending to avoid flip-flops across sites.
    await client.query(
        `UPDATE users
         SET
            approval_status = $2,
            is_approved = ($2 = 'approved'),
            role = CASE WHEN $2 = 'approved' THEN $3 ELSE role END,
            approved_by = COALESCE(approved_by, $4),
            approved_at = COALESCE(approved_at, $5)
         WHERE user_id = $1
           AND approval_status = 'pending'`,
        [user_id, approval_status, assigned_role, approved_by ?? null, approved_at ?? null]
    );
}

async function receiveEvents(req, res) {
    if (!requireSyncSecret(req)) {
        return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const { events } = req.body || {};
    if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ success: false, error: "Missing events" });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        let applied = 0;
        for (const evt of events) {
            const { event_id, source_site_id, event_type, payload } = evt || {};
            if (!event_id || !source_site_id || !event_type || !payload) continue;

            const inboxInsert = await client.query(
                `INSERT INTO inbox_events (event_id, source_site_id)
                 VALUES ($1, $2)
                 ON CONFLICT (event_id, source_site_id) DO NOTHING
                 RETURNING event_id`,
                [event_id, source_site_id]
            );

            if (inboxInsert.rows.length === 0) {
                continue; // already processed
            }

            if (event_type === "STOCK_MOVEMENT") {
                await applyStockMovement(client, payload);
                applied += 1;
            } else if (event_type === "USER_APPROVAL") {
                await applyUserApproval(client, payload);
                applied += 1;
            }
        }

        await client.query("COMMIT");
        return res.json({ success: true, applied });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Sync receive error:", err.message);
        return res.status(500).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
}

module.exports = {
    receiveEvents
};

