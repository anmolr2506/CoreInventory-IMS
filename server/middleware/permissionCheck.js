const pool = require("../db");

/**
 * Middleware to check specific permissions
 * @param {string|array} requiredPermissions - Permission(s) required to access the route
 */
const checkPermission = (requiredPermissions) => {
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

            // Admin has all permissions
            if (userRole === 'admin') {
                return next();
            }

            // Check if user has required permissions
            const permissionsArray = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

            const permResult = await pool.query(
                "SELECT permission_name FROM role_permissions WHERE role = $1 AND permission_name = ANY($2)",
                [userRole, permissionsArray]
            );

            if (permResult.rows.length === 0) {
                return res.status(403).json(`Forbidden: You don't have the required permissions`);
            }

            next();
        } catch (err) {
            console.error(err.message);
            res.status(500).json("Server Error");
        }
    };
};

/**
 * Get all permissions for a role
 */
const getRolePermissions = async (role) => {
    try {
        if (role === 'admin') {
            // Return all possible permissions for admin
            return {
                role: 'admin',
                permissions: [
                    'create_receipt',
                    'update_receipt',
                    'approve_receipt',
                    'create_delivery',
                    'update_delivery',
                    'approve_delivery',
                    'create_transfer',
                    'approve_transfer',
                    'perform_picking',
                    'perform_shelving',
                    'perform_counting',
                    'view_inventory',
                    'view_assigned_warehouse_inventory',
                    'view_analytics',
                    'manage_products',
                    'view_reports',
                    'manage_users',
                    'manage_warehouses'
                ]
            };
        }

        const result = await pool.query(
            "SELECT permission_name FROM role_permissions WHERE role = $1 ORDER BY permission_name",
            [role]
        );

        return {
            role,
            permissions: result.rows.map(r => r.permission_name)
        };
    } catch (err) {
        console.error("Error fetching permissions:", err.message);
        return { role, permissions: [] };
    }
};

module.exports = {
    checkPermission,
    getRolePermissions
};
