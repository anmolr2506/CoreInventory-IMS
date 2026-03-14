const pool = require('./db');
const bcrypt = require('bcrypt');

async function setupTestAdmin() {
    try {
        console.log('Setting up test admin account...');
        
        // Check if admin already exists
        const existingAdmin = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            ['admin@example.com']
        );

        const password = 'admin123';
        const salt = await bcrypt.genSalt(10);
        const bcryptPassword = await bcrypt.hash(password, salt);

        if (existingAdmin.rows.length > 0) {
            // Update existing admin
            await pool.query(
                `UPDATE users SET password_hash = $1, role = $2, is_approved = $3, approval_status = $4 
                WHERE email = $5`,
                [bcryptPassword, 'admin', true, 'approved', 'admin@example.com']
            );
            console.log('✓ Updated existing admin account');
        } else {
            // Create new admin
            await pool.query(
                `INSERT INTO users (name, email, password_hash, role, is_approved, approval_status) 
                VALUES ($1, $2, $3, $4, $5, $6)`,
                ['Admin User', 'admin@example.com', bcryptPassword, 'admin', true, 'approved']
            );
            console.log('✓ Created new admin account');
        }

        console.log('\nTest Admin Credentials:');
        console.log(`  Email: admin@example.com`);
        console.log(`  Password: ${password}`);
        console.log('\nUse these credentials to login and test the approval workflow.');
        
        process.exit(0);
    } catch (err) {
        console.error('Error setting up test admin:', err);
        process.exit(1);
    }
}

setupTestAdmin();
