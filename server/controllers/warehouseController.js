const pool = require("../db");
const { logOperation } = require("../utils/auditLog");

/**
 * Warehouse Controller
 * Manages warehouse CRUD operations
 */

// Get all warehouses
const getAllWarehouses = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT warehouse_id, name, location, short_code, created_at FROM warehouses ORDER BY name"
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
};

// Get warehouse by ID
const getWarehouse = async (req, res) => {
    try {
        const { warehouse_id } = req.params;
        const result = await pool.query(
            "SELECT * FROM warehouses WHERE warehouse_id = $1",
            [warehouse_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json("Warehouse not found");
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
};

// Create warehouse
const createWarehouse = async (req, res) => {
    try {
        const { name, shortCode, address } = req.body;
        const userId = req.user?.id;

        // Validate short code uniqueness
        const existingCode = await pool.query(
            "SELECT warehouse_id FROM warehouses WHERE LOWER(short_code) = LOWER($1)",
            [shortCode]
        );

        if (existingCode.rows.length > 0) {
            return res.status(400).json("Short code already exists. Please use a unique code.");
        }

        // Validate inputs
        if (!name || !shortCode || !address) {
            return res.status(400).json("Missing required fields: name, shortCode, address");
        }

        // Validate short code length (max 3 characters)
        if (shortCode.length > 3) {
            return res.status(400).json("Short code must be 3 characters or less");
        }

        const result = await pool.query(
            "INSERT INTO warehouses (name, short_code, location) VALUES ($1, $2, $3) RETURNING *",
            [name, shortCode.toUpperCase(), address]
        );

        // Log operation
        if (userId) {
            await logOperation(userId, 'WAREHOUSE_CREATED', {
                warehouse_id: result.rows[0].warehouse_id,
                name,
                shortCode: shortCode.toUpperCase(),
                address
            }, result.rows[0].warehouse_id);
        }

        res.status(201).json({
            message: "Warehouse created successfully",
            warehouse: result.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
};

// Update warehouse
const updateWarehouse = async (req, res) => {
    try {
        const { warehouse_id } = req.params;
        const { name, shortCode, address } = req.body;
        const userId = req.user?.id;

        // Check if warehouse exists
        const existing = await pool.query(
            "SELECT * FROM warehouses WHERE warehouse_id = $1",
            [warehouse_id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json("Warehouse not found");
        }

        // Validate short code uniqueness (excluding current warehouse)
        if (shortCode && shortCode !== existing.rows[0].short_code) {
            const codeCheck = await pool.query(
                "SELECT warehouse_id FROM warehouses WHERE LOWER(short_code) = LOWER($1) AND warehouse_id != $2",
                [shortCode, warehouse_id]
            );

            if (codeCheck.rows.length > 0) {
                return res.status(400).json("Short code already exists. Please use a unique code.");
            }
        }

        const result = await pool.query(
            "UPDATE warehouses SET name = $1, short_code = $2, location = $3 WHERE warehouse_id = $4 RETURNING *",
            [
                name || existing.rows[0].name,
                shortCode ? shortCode.toUpperCase() : existing.rows[0].short_code,
                address || existing.rows[0].location,
                warehouse_id
            ]
        );

        // Log operation
        if (userId) {
            await logOperation(userId, 'WAREHOUSE_UPDATED', {
                warehouse_id,
                name: result.rows[0].name,
                shortCode: result.rows[0].short_code,
                address: result.rows[0].location
            }, warehouse_id);
        }

        res.json({
            message: "Warehouse updated successfully",
            warehouse: result.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
};

// Delete warehouse
const deleteWarehouse = async (req, res) => {
    try {
        const { warehouse_id } = req.params;
        const userId = req.user?.id;

        // Check if warehouse has any inventory
        const inventoryCheck = await pool.query(
            "SELECT COUNT(*) as count FROM inventory WHERE warehouse_id = $1",
            [warehouse_id]
        );

        if (inventoryCheck.rows[0].count > 0) {
            return res.status(400).json("Cannot delete warehouse with existing inventory. Clear inventory first.");
        }

        const result = await pool.query(
            "DELETE FROM warehouses WHERE warehouse_id = $1 RETURNING *",
            [warehouse_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json("Warehouse not found");
        }

        // Log operation
        if (userId) {
            await logOperation(userId, 'WAREHOUSE_DELETED', {
                warehouse_id,
                name: result.rows[0].name
            }, warehouse_id);
        }

        res.json({
            message: "Warehouse deleted successfully",
            warehouse: result.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
};

module.exports = {
    getAllWarehouses,
    getWarehouse,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse
};
