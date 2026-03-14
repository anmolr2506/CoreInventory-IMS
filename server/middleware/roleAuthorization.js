const pool = require("../db");

/**
 * Middleware to verify user has required role
 * @param {string|array} requiredRoles - Role(s) required to access the route
 */
const checkRole = (requiredRoles) => {
    return async (req, res, next) => {
        try {
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json("Unauthorized: No user found");
            }

            const userResult = await pool.query(
                "SELECT role FROM users WHERE user_id = $1 AND is_active = true",
                [userId]
            );

            if (userResult.rows.length === 0) {
                return res.status(401).json("Unauthorized: User not found or inactive");
            }

            const userRole = userResult.rows[0].role;
            const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

            // Admin has access to everything
            if (userRole === 'admin') {
                return next();
            }

            if (!rolesArray.includes(userRole)) {
                return res.status(403).json(`Forbidden: This action requires ${rolesArray.join(' or ')} role`);
            }

            next();
        } catch (err) {
            console.error(err.message);
            res.status(500).json("Server Error");
        }
    };
};

/**
 * Middleware to verify warehouse access for staff
 * Managers and Admins have access to all warehouses
 */
const checkWarehouseAccess = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const warehouseId = req.body?.warehouse_id || req.params?.warehouse_id || req.query?.warehouse_id;

        if (!userId || !warehouseId) {
            return next(); // Skip if no warehouse specified
        }

        const userResult = await pool.query(
            "SELECT role FROM users WHERE user_id = $1 AND is_active = true",
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json("Unauthorized");
        }

        const userRole = userResult.rows[0].role;

        // Manager and Admin can access all warehouses
        if (userRole === 'manager' || userRole === 'admin') {
            return next();
        }

        // Staff can only access assigned warehouses
        if (userRole === 'staff') {
            const warehouseResult = await pool.query(
                "SELECT warehouse_id FROM warehouse_assignments WHERE user_id = $1 AND warehouse_id = $2",
                [userId, warehouseId]
            );

            if (warehouseResult.rows.length === 0) {
                return res.status(403).json("Forbidden: You don't have access to this warehouse");
            }
        }

        next();
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
};

/**
 * Middleware to get user's accessible warehouses
 */
const getUserWarehouses = async (userId, role) => {
    if (role === 'admin' || role === 'manager') {
        // They can access all warehouses
        const result = await pool.query("SELECT warehouse_id, name FROM warehouses");
        return result.rows;
    }

    // Staff can only access assigned warehouses
    const result = await pool.query(
        "SELECT warehouseId, w.name FROM warehouse_assignments wa JOIN warehouses w ON wa.warehouse_id = w.warehouse_id WHERE user_id = $1",
        [userId]
    );
    return result.rows;
};

module.exports = {
    checkRole,
    checkWarehouseAccess,
    getUserWarehouses
};
