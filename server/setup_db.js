const { Pool } = require("pg");

async function setup() {
    const pool1 = new Pool({
        user: "postgres",
        password: "postgres",
        host: "localhost",
        port: 5432,
        database: "postgres"
    });

    try {
        await pool1.query('CREATE DATABASE coreinventory');
        console.log("Created coreinventory database");
    } catch (e) {
        console.log("Database might already exist:", e.message);
    } finally {
        await pool1.end();
    }

    const pool2 = new Pool({
        user: "postgres",
        password: "postgres",
        host: "localhost",
        port: 5432,
        database: "coreinventory"
    });

    try {
        await pool2.query(`
            CREATE TABLE IF NOT EXISTS users (
                user_id SERIAL PRIMARY KEY,
                username VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                reset_otp VARCHAR(6),
                reset_otp_expiry TIMESTAMP
            );
        `);
        console.log("Created users table");
    } catch (e) {
        console.error("Error creating table:", e.message);
    } finally {
        await pool2.end();
    }
}

setup();
