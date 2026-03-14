require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const pool = require('./db');

async function updateSchema() {
    try {
        console.log("Updating database schema...");
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS reset_otp VARCHAR(6),
            ADD COLUMN IF NOT EXISTS reset_otp_expiry TIMESTAMP;
        `);

        await pool.query(`
            ALTER TABLE inventory
            ADD COLUMN IF NOT EXISTS reserved_quantity INT NOT NULL DEFAULT 0;
        `);

        await pool.query(`
            ALTER TABLE inventory
            ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_inventory_product_warehouse
            ON inventory(product_id, warehouse_id);
        `);

        console.log("Database schema updated successfully.");
    } catch (err) {
        console.error("Error updating schema:", err);
    } finally {
        pool.end();
    }
}

updateSchema();
