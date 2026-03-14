const pool = require('./db');
const bcrypt = require('bcrypt');

async function setupTestAdmins() {
    try {
        console.log('Setting up test admin accounts...');

        const adminConfigs = [
            {
                label: 'Demo Admin (with seeded data)',
                name: 'Admin User',
                email: 'admin@example.com',
                password: 'admin123'
            },
            {
                label: 'Clean Admin (for empty DB)',
                name: 'Clean Admin',
                email: 'cleanadmin@example.com',
                password: 'admin123'
            }
        ];

        for (const admin of adminConfigs) {
            const existing = await pool.query(
                'SELECT * FROM users WHERE email = $1',
                [admin.email]
            );

            const salt = await bcrypt.genSalt(10);
            const bcryptPassword = await bcrypt.hash(admin.password, salt);

            if (existing.rows.length > 0) {
                await pool.query(
                    `UPDATE users 
                     SET password_hash = $1, role = $2, is_approved = $3, approval_status = $4, name = $5
                     WHERE email = $6`,
                    [bcryptPassword, 'admin', true, 'approved', admin.name, admin.email]
                );
                console.log(`✓ Updated existing ${admin.label}: ${admin.email}`);
            } else {
                await pool.query(
                    `INSERT INTO users (name, email, password_hash, role, is_approved, approval_status) 
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [admin.name, admin.email, bcryptPassword, 'admin', true, 'approved']
                );
                console.log(`✓ Created ${admin.label}: ${admin.email}`);
            }
        }

        console.log('\nTest Admin Credentials:');
        console.log('  1) Demo Admin (use with seeded dashboard data)');
        console.log('     Email: admin@example.com');
        console.log('     Password: admin123');
        console.log('  2) Clean Admin (use on empty / freshly migrated DB)');
        console.log('     Email: cleanadmin@example.com');
        console.log('     Password: admin123');
        console.log('\nRun this script any time after migrations to (re)create both admins.');

        process.exit(0);
    } catch (err) {
        console.error('Error setting up test admins:', err);
        process.exit(1);
    }
}

setupTestAdmins();
