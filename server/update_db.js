const pool = require('./db');

async function updateSchema() {
    try {
        console.log("Updating database schema...");
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS reset_otp VARCHAR(6),
            ADD COLUMN IF NOT EXISTS reset_otp_expiry TIMESTAMP;
        `);
        console.log("Database schema updated successfully.");
    } catch (err) {
        console.error("Error updating schema:", err);
    } finally {
        pool.end();
    }
}

updateSchema();
