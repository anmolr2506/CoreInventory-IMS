const pool = require("../db");

/**
 * Blocks access for users who are not yet approved.
 * Intended to be used after authMiddleware.
 */
module.exports = function requireApprovedUser(req, res, next) {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });
    }

    // If authMiddleware already hydrated user fields, use them.
    if (req.user.is_approved !== undefined && req.user.approval_status) {
        if (req.user.is_approved === true && req.user.approval_status === "approved") {
            return next();
        }
        return res.status(403).json({
            code: "USER_NOT_APPROVED",
            approval_status: req.user.approval_status,
            is_approved: req.user.is_approved
        });
    }

    // Fallback: query DB.
    pool.query(
        "SELECT is_approved, approval_status FROM users WHERE user_id = $1 AND is_active = true",
        [userId]
    )
        .then((result) => {
            if (result.rows.length === 0) {
                return res.status(401).json({ code: "UNAUTHORIZED", message: "Unauthorized" });
            }
            const { is_approved, approval_status } = result.rows[0];
            if (is_approved === true && approval_status === "approved") {
                return next();
            }
            return res.status(403).json({
                code: "USER_NOT_APPROVED",
                approval_status,
                is_approved
            });
        })
        .catch((err) => {
            console.error(err.message);
            return res.status(500).json({ code: "SERVER_ERROR", message: "Server Error" });
        });
};

