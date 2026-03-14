const pool = require("../db");

const createSupplier = async (req, res) => {
    try {
        const { name, contact_person, email, phone, address } = req.body || {};

        if (!name || !name.trim()) {
            return res.status(400).json("Supplier name is required");
        }

        const normalizedName = name.trim();
        const result = await pool.query(
            `
            INSERT INTO suppliers (name, contact_person, email, phone, address)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (name)
            DO UPDATE SET
                contact_person = EXCLUDED.contact_person,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone,
                address = EXCLUDED.address
            RETURNING supplier_id, name, contact_person, email, phone, address
            `,
            [
                normalizedName,
                contact_person || null,
                email || null,
                phone || null,
                address || null
            ]
        );

        return res.status(201).json({
            message: "Supplier saved",
            supplier: result.rows[0]
        });
    } catch (err) {
        console.error("Error creating supplier:", err.message);
        return res.status(500).json("Server Error");
    }
};

module.exports = {
    createSupplier
};

