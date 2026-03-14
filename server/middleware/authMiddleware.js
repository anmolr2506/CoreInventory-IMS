const jwt = require("jsonwebtoken");
const pool = require("../db");

const authorize = (req, res, next) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res.status(403).json("Not Authorized");
        }

        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const payloadUser = payload.user;

        // Support both legacy numeric payloads and object payloads.
        const userId = typeof payloadUser === "object"
            ? payloadUser?.id ?? payloadUser?.user_id
            : payloadUser;

        if (!userId) {
            return res.status(403).json("Not Authorized");
        }

        // Hydrate user record for downstream RBAC/approval checks.
        pool.query(
            "SELECT user_id, role, is_approved, approval_status, is_active FROM users WHERE user_id = $1",
            [userId]
        )
            .then((result) => {
                if (result.rows.length === 0 || result.rows[0].is_active !== true) {
                    return res.status(403).json("Not Authorized");
                }

                const u = result.rows[0];
                req.user = {
                    id: u.user_id,
                    role: u.role,
                    is_approved: u.is_approved,
                    approval_status: u.approval_status
                };
                return next();
            })
            .catch((err) => {
                console.error(err.message);
                return res.status(500).json("Server Error");
            });
    } catch (err) {
        console.error(err.message);
        return res.status(403).json("Not Authorized");
    }
};

module.exports = authorize;
