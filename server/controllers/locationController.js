const pool = require("../db");
const { logOperation } = require("../utils/auditLog");

/**
 * Location Controller
 * Manages warehouse locations (rooms, zones, shelves, etc.)
 */

// Get all locations
const getAllLocations = async (req, res) => {
    try {
        const { warehouse_id } = req.query;
        
        let query = `
            SELECT 
                l.location_id,
                l.name,
                l.short_code,
                l.warehouse_id,
                w.name as warehouse_name,
                w.short_code as warehouse_code,
                l.created_at
            FROM locations l
            JOIN warehouses w ON l.warehouse_id = w.warehouse_id
        `;

        const params = [];

        if (warehouse_id) {
            query += " WHERE l.warehouse_id = $1";
            params.push(warehouse_id);
        }

        query += " ORDER BY w.name, l.name";

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
};

// Get location by ID
const getLocation = async (req, res) => {
    try {
        const { location_id } = req.params;

        const result = await pool.query(
            `SELECT 
                l.location_id,
                l.name,
                l.short_code,
                l.warehouse_id,
                w.name as warehouse_name,
                w.short_code as warehouse_code,
                l.created_at
            FROM locations l
            JOIN warehouses w ON l.warehouse_id = w.warehouse_id
            WHERE l.location_id = $1`,
            [location_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json("Location not found");
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
};

// Create location
const createLocation = async (req, res) => {
    try {
        const { name, shortCode, warehouse } = req.body;
        const userId = req.user?.id;

        // Validate inputs
        if (!name || !shortCode || !warehouse) {
            return res.status(400).json("Missing required fields: name, shortCode, warehouse");
        }

        // Get warehouse by short code or ID
        let warehouseResult = await pool.query(
            "SELECT warehouse_id, short_code FROM warehouses WHERE LOWER(short_code) = LOWER($1) OR warehouse_id = $1",
            [warehouse]
        );

        if (warehouseResult.rows.length === 0) {
            return res.status(400).json("Warehouse not found. Check warehouse short code or ID.");
        }

        const warehouseId = warehouseResult.rows[0].warehouse_id;

        // Check unique constraint: location short code must be unique within warehouse
        const existingLoc = await pool.query(
            "SELECT location_id FROM locations WHERE warehouse_id = $1 AND LOWER(short_code) = LOWER($2)",
            [warehouseId, shortCode]
        );

        if (existingLoc.rows.length > 0) {
            return res.status(400).json("Location short code already exists in this warehouse. Please use a unique code.");
        }

        const result = await pool.query(
            "INSERT INTO locations (name, short_code, warehouse_id) VALUES ($1, $2, $3) RETURNING *",
            [name, shortCode.toUpperCase(), warehouseId]
        );

        // Fetch complete location info
        const completeResult = await pool.query(
            `SELECT 
                l.location_id,
                l.name,
                l.short_code,
                l.warehouse_id,
                w.name as warehouse_name,
                w.short_code as warehouse_code,
                l.created_at
            FROM locations l
            JOIN warehouses w ON l.warehouse_id = w.warehouse_id
            WHERE l.location_id = $1`,
            [result.rows[0].location_id]
        );

        // Log operation
        if (userId) {
            await logOperation(userId, 'LOCATION_CREATED', {
                location_id: result.rows[0].location_id,
                name,
                shortCode: shortCode.toUpperCase(),
                warehouse_id: warehouseId,
                warehouse_code: warehouseResult.rows[0].short_code
            }, result.rows[0].location_id);
        }

        res.status(201).json({
            message: "Location created successfully",
            location: completeResult.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
};

// Update location
const updateLocation = async (req, res) => {
    try {
        const { location_id } = req.params;
        const { name, shortCode, warehouse } = req.body;
        const userId = req.user?.id;

        // Check if location exists
        const existing = await pool.query(
            "SELECT * FROM locations WHERE location_id = $1",
            [location_id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json("Location not found");
        }

        let warehouseId = existing.rows[0].warehouse_id;

        // If warehouse is being changed
        if (warehouse) {
            const warehouseResult = await pool.query(
                "SELECT warehouse_id FROM warehouses WHERE LOWER(short_code) = LOWER($1) OR warehouse_id = $1",
                [warehouse]
            );

            if (warehouseResult.rows.length === 0) {
                return res.status(400).json("Warehouse not found");
            }

            warehouseId = warehouseResult.rows[0].warehouse_id;
        }

        // Check short code uniqueness
        if (shortCode && shortCode !== existing.rows[0].short_code) {
            const codeCheck = await pool.query(
                "SELECT location_id FROM locations WHERE warehouse_id = $1 AND LOWER(short_code) = LOWER($2) AND location_id != $3",
                [warehouseId, shortCode, location_id]
            );

            if (codeCheck.rows.length > 0) {
                return res.status(400).json("Location short code already exists in this warehouse");
            }
        }

        const result = await pool.query(
            "UPDATE locations SET name = $1, short_code = $2, warehouse_id = $3 WHERE location_id = $4 RETURNING *",
            [
                name || existing.rows[0].name,
                shortCode ? shortCode.toUpperCase() : existing.rows[0].short_code,
                warehouseId,
                location_id
            ]
        );

        // Fetch complete location info
        const completeResult = await pool.query(
            `SELECT 
                l.location_id,
                l.name,
                l.short_code,
                l.warehouse_id,
                w.name as warehouse_name,
                w.short_code as warehouse_code,
                l.created_at
            FROM locations l
            JOIN warehouses w ON l.warehouse_id = w.warehouse_id
            WHERE l.location_id = $1`,
            [location_id]
        );

        // Log operation
        if (userId) {
            await logOperation(userId, 'LOCATION_UPDATED', {
                location_id,
                name: result.rows[0].name,
                shortCode: result.rows[0].short_code,
                warehouse_id: warehouseId
            }, location_id);
        }

        res.json({
            message: "Location updated successfully",
            location: completeResult.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
};

// Delete location
const deleteLocation = async (req, res) => {
    try {
        const { location_id } = req.params;
        const userId = req.user?.id;

        const result = await pool.query(
            "DELETE FROM locations WHERE location_id = $1 RETURNING *",
            [location_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json("Location not found");
        }

        // Log operation
        if (userId) {
            await logOperation(userId, 'LOCATION_DELETED', {
                location_id,
                name: result.rows[0].name
            }, location_id);
        }

        res.json({
            message: "Location deleted successfully",
            location: result.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
};

module.exports = {
    getAllLocations,
    getLocation,
    createLocation,
    updateLocation,
    deleteLocation
};
