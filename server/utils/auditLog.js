const pool = require("../db");

/**
 * Log operation to audit trail
 * Useful for tracking all inventory operations with user and timestamp
 */
const logOperation = async (userId, operationType, operationDetails, referenceId = null) => {
    try {
        // Insert into stock_ledger for tracking
        if (operationDetails.product_id && operationDetails.warehouse_id && operationDetails.quantity) {
            await pool.query(
                `INSERT INTO stock_ledger 
                (product_id, warehouse_id, operation_type, quantity, reference_id) 
                VALUES ($1, $2, $3, $4, $5)`,
                [
                    operationDetails.product_id,
                    operationDetails.warehouse_id,
                    operationType.toUpperCase(),
                    operationDetails.quantity,
                    referenceId
                ]
            );
        }

        // Extended audit logging (optional - can log to separate audit table or file)
        console.log(`[AUDIT] Operation: ${operationType}, User: ${userId}, Details:`, {
            timestamp: new Date().toISOString(),
            ...operationDetails
        });

    } catch (err) {
        console.error("Error logging operation:", err.message);
        // Don't throw - logging failure shouldn't block the operation
    }
};

/**
 * Get audit trail for an entity
 * Useful for viewing operation history
 */
const getAuditTrail = async (referenceType, referenceId, limit = 50) => {
    try {
        let query = `
            SELECT 
                sl.ledger_id,
                sl.operation_type,
                sl.quantity,
                p.name as product_name,
                w.name as warehouse_name,
                sl.created_at,
                u.name as performed_by
            FROM stock_ledger sl
            LEFT JOIN products p ON sl.product_id = p.product_id
            LEFT JOIN warehouses w ON sl.warehouse_id = w.warehouse_id
            LEFT JOIN users u ON sl.created_at = (
                SELECT created_at FROM stock_ledger WHERE ledger_id = sl.ledger_id
            )
        `;

        if (referenceId) {
            query += ` WHERE sl.reference_id = $1`;
        }

        query += ` ORDER BY sl.created_at DESC LIMIT $${referenceId ? 2 : 1}`;
        
        const params = referenceId ? [referenceId, limit] : [limit];
        const result = await pool.query(query, params);
        
        return result.rows;
    } catch (err) {
        console.error("Error retrieving audit trail:", err.message);
        return [];
    }
};

module.exports = {
    logOperation,
    getAuditTrail
};
