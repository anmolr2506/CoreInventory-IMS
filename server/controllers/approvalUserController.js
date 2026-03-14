const pool = require("../db");
const { logOperation } = require("../utils/auditLog");
const { enqueueEvent } = require("../utils/outbox");

/**
 * Approval Controller
 * Manages user approval workflow
 * - Managers approve staff
 * - Admins approve both managers and staff
 */

/**
 * Get pending approval requests for managers and admins
 */
const getPendingApprovals = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        let query = `
            SELECT 
                u.user_id,
                u.name,
                u.email,
                u.requested_role,
                u.approval_status,
                u.created_at,
                u.approval_status,
                COUNT(*) OVER () as total_count
            FROM users u
            WHERE u.approval_status = 'pending'
        `;

        const params = [];

        // Managers can only see staff approval requests
        if (userRole === 'manager') {
            params.push('staff');
            query += ` AND u.requested_role = $${params.length}`;
        }
        // Admins can see all pending requests (staff and manager)

        query += ` ORDER BY u.created_at ASC`;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length,
            total_count: result.rows[0]?.total_count || 0
        });
    } catch (err) {
        console.error("Error fetching pending approvals:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Approve a user (manager approves staff, admin approves both)
 */
const approveUser = async (req, res) => {
    const client = await pool.connect();
    try {
        const { user_id } = req.params;
        const approverId = req.user.id;
        const approverRole = req.user.role;

        // Get the user to approve
        const userResult = await client.query(
            `SELECT user_id, requested_role, approval_status FROM users WHERE user_id = $1`,
            [user_id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        const userToApprove = userResult.rows[0];

        // Validate permission
        if (approverRole === 'manager' && userToApprove.requested_role !== 'staff') {
            return res.status(403).json({ 
                success: false, 
                error: "Managers can only approve staff" 
            });
        }

        if (userToApprove.approval_status !== 'pending') {
            return res.status(400).json({ 
                success: false, 
                error: `User already ${userToApprove.approval_status}` 
            });
        }

        // Start transaction
        await client.query("BEGIN");

        // Update user approval
        const updateResult = await client.query(
            `UPDATE users 
            SET 
                is_approved = true,
                approval_status = 'approved',
                approved_by = $1,
                approved_at = CURRENT_TIMESTAMP,
                role = requested_role
            WHERE user_id = $2
            RETURNING *`,
            [approverId, user_id]
        );

        // If no rows updated, rollback
        if (updateResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(500).json({ success: false, error: "Failed to update user" });
        }

        const approvedUser = updateResult.rows[0];

        // Log operation
        await logOperation(approverId, 'USER_APPROVED', {
            user_id,
            user_name: approvedUser.name,
            user_email: approvedUser.email,
            assigned_role: approvedUser.role
        }, user_id);

        await enqueueEvent("USER_APPROVAL", {
            user_id: approvedUser.user_id,
            approval_status: "approved",
            assigned_role: approvedUser.role,
            approved_by: approverId,
            approved_at: approvedUser.approved_at
        });

        await client.query("COMMIT");

        res.json({
            success: true,
            message: `${approvedUser.name} approved as ${approvedUser.role}`,
            user: approvedUser
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Error approving user:", err.message);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
};

/**
 * Reject a user approval request
 */
const rejectUser = async (req, res) => {
    const client = await pool.connect();
    try {
        const { user_id } = req.params;
        const approverId = req.user.id;
        const approverRole = req.user.role;
        const { reason } = req.body;

        // Get the user to reject
        const userResult = await client.query(
            `SELECT user_id, requested_role, approval_status, name, email FROM users WHERE user_id = $1`,
            [user_id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        const userToReject = userResult.rows[0];

        // Validate permission
        if (approverRole === 'manager' && userToReject.requested_role !== 'staff') {
            return res.status(403).json({ 
                success: false, 
                error: "Managers can only reject staff approvals" 
            });
        }

        if (userToReject.approval_status !== 'pending') {
            return res.status(400).json({ 
                success: false, 
                error: `User already ${userToReject.approval_status}` 
            });
        }

        // Start transaction
        await client.query("BEGIN");

        // Update user rejection
        const updateResult = await client.query(
            `UPDATE users 
            SET 
                approval_status = 'rejected',
                approved_by = $1,
                approved_at = CURRENT_TIMESTAMP
            WHERE user_id = $2
            RETURNING *`,
            [approverId, user_id]
        );

        // Log operation
        await logOperation(approverId, 'USER_REJECTED', {
            user_id,
            user_name: userToReject.name,
            user_email: userToReject.email,
            requested_role: userToReject.requested_role,
            reason: reason || 'No reason provided'
        }, user_id);

        await enqueueEvent("USER_APPROVAL", {
            user_id: userToReject.user_id,
            approval_status: "rejected",
            assigned_role: null,
            approved_by: approverId,
            approved_at: updateResult.rows[0]?.approved_at
        });

        await client.query("COMMIT");

        res.json({
            success: true,
            message: `${userToReject.name} approval rejected`,
            user: updateResult.rows[0]
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Error rejecting user:", err.message);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
};

/**
 * Get approval status for logged-in user
 */
const getUserApprovalStatus = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT 
                user_id,
                name,
                email,
                role,
                is_approved,
                approval_status,
                requested_role,
                created_at
            FROM users 
            WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        const user = result.rows[0];

        res.json({
            success: true,
            is_approved: user.is_approved,
            approval_status: user.approval_status,
            requested_role: user.requested_role,
            current_role: user.role,
            user: user
        });
    } catch (err) {
        console.error("Error fetching approval status:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * Get all users with their approval status (admin only)
 */
const getAllUsersWithStatus = async (req, res) => {
    try {
        const { approval_status, role } = req.query;

        let query = `
            SELECT 
                user_id,
                name,
                email,
                role,
                requested_role,
                approval_status,
                is_approved,
                created_at,
                approved_at,
                (SELECT name FROM users u2 WHERE u2.user_id = users.approved_by) as approved_by_name
            FROM users
            WHERE 1=1
        `;

        const params = [];

        if (approval_status) {
            params.push(approval_status);
            query += ` AND approval_status = $${params.length}`;
        }

        if (role) {
            params.push(role);
            query += ` AND role = $${params.length}`;
        }

        query += ` ORDER BY created_at DESC`;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
    } catch (err) {
        console.error("Error fetching users:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = {
    getPendingApprovals,
    approveUser,
    rejectUser,
    getUserApprovalStatus,
    getAllUsersWithStatus
};
