require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const pool = require("./db");

// Helper to get random int between min and max (inclusive)
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper to get random date within last N days
const randDate = (daysBack) => {
    const now = new Date();
    const past = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    const randomTime = past.getTime() + Math.random() * (now.getTime() - past.getTime());
    return new Date(randomTime).toISOString();
};

const pick = (arr) => arr[randInt(0, arr.length - 1)];

async function seed() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // ================================
        // CREATE TABLES IF NOT EXIST
        // ================================
        await client.query(`
            CREATE TABLE IF NOT EXISTS categories (
                category_id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT
            );
            CREATE TABLE IF NOT EXISTS products (
                product_id SERIAL PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                sku VARCHAR(100) NOT NULL UNIQUE,
                category_id INT NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT,
                unit VARCHAR(20) NOT NULL,
                reorder_level INT DEFAULT 0 CHECK (reorder_level >= 0),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS warehouses (
                warehouse_id SERIAL PRIMARY KEY,
                name VARCHAR(150) NOT NULL UNIQUE,
                location TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS suppliers (
                supplier_id SERIAL PRIMARY KEY,
                name VARCHAR(150) NOT NULL UNIQUE,
                contact_person VARCHAR(100),
                email VARCHAR(150),
                phone VARCHAR(50),
                address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS inventory (
                inventory_id SERIAL PRIMARY KEY,
                product_id INT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
                warehouse_id INT NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,
                quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_product_warehouse UNIQUE (product_id, warehouse_id)
            );
            CREATE TABLE IF NOT EXISTS receipts (
                receipt_id SERIAL PRIMARY KEY,
                product_id INT NOT NULL REFERENCES products(product_id),
                warehouse_id INT NOT NULL REFERENCES warehouses(warehouse_id),
                supplier_id INT REFERENCES suppliers(supplier_id),
                quantity INT NOT NULL CHECK (quantity > 0),
                received_by INT,
                received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS deliveries (
                delivery_id SERIAL PRIMARY KEY,
                product_id INT NOT NULL REFERENCES products(product_id),
                warehouse_id INT NOT NULL REFERENCES warehouses(warehouse_id),
                customer_name VARCHAR(150) NOT NULL,
                quantity INT NOT NULL CHECK (quantity > 0),
                delivered_by INT,
                delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS transfers (
                transfer_id SERIAL PRIMARY KEY,
                product_id INT NOT NULL REFERENCES products(product_id),
                from_warehouse INT NOT NULL REFERENCES warehouses(warehouse_id),
                to_warehouse INT NOT NULL REFERENCES warehouses(warehouse_id),
                quantity INT NOT NULL CHECK (quantity > 0),
                transferred_by INT,
                transferred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT warehouse_check CHECK (from_warehouse <> to_warehouse)
            );
            CREATE TABLE IF NOT EXISTS stock_adjustments (
                adjustment_id SERIAL PRIMARY KEY,
                product_id INT NOT NULL REFERENCES products(product_id),
                warehouse_id INT NOT NULL REFERENCES warehouses(warehouse_id),
                adjustment INT NOT NULL,
                reason TEXT NOT NULL,
                adjusted_by INT,
                adjusted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS stock_ledger (
                ledger_id SERIAL PRIMARY KEY,
                product_id INT NOT NULL REFERENCES products(product_id),
                warehouse_id INT NOT NULL REFERENCES warehouses(warehouse_id),
                operation_type VARCHAR(30) NOT NULL CHECK (operation_type IN ('RECEIPT','DELIVERY','TRANSFER','ADJUSTMENT')),
                quantity INT NOT NULL,
                reference_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS supplier_products (
                supplier_id INT REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
                product_id INT REFERENCES products(product_id) ON DELETE CASCADE,
                price NUMERIC(10,2),
                lead_time_days INT,
                PRIMARY KEY (supplier_id, product_id)
            );
        `);
        console.log("✓ All tables created/verified");

        // ================================
        // CATEGORIES (20)
        // ================================
        const categoryNames = [
            "Raw Materials", "Finished Goods", "Electronics", "Office Supplies",
            "Packaging", "Chemicals", "Hardware", "Textiles", "Automotive Parts",
            "Food & Beverages", "Medical Supplies", "Cleaning Products",
            "Safety Equipment", "Tools", "Plumbing", "Electrical",
            "Building Materials", "Furniture", "Stationery", "Lubricants"
        ];

        const categoryIds = [];
        for (const name of categoryNames) {
            const res = await client.query(
                `INSERT INTO categories (name, description)
                 VALUES ($1, $2)
                 ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
                 RETURNING category_id`,
                [name, `${name} category for inventory management`]
            );
            categoryIds.push(res.rows[0].category_id);
        }
        console.log(`✓ Seeded ${categoryIds.length} categories`);

        // ================================
        // WAREHOUSES (5)
        // ================================
        const warehouseData = [
            ["Main Warehouse", "Building A, Industrial Area"],
            ["Production Floor", "Building B, Manufacturing Zone"],
            ["Secondary Warehouse", "Building C, Storage Complex"],
            ["Distribution Center", "Building D, Logistics Hub"],
            ["Cold Storage", "Building E, Refrigerated Unit"]
        ];

        const warehouseIds = [];
        for (const [name, location] of warehouseData) {
            const res = await client.query(
                `INSERT INTO warehouses (name, location)
                 VALUES ($1, $2)
                 ON CONFLICT (name) DO UPDATE SET location = EXCLUDED.location
                 RETURNING warehouse_id`,
                [name, location]
            );
            warehouseIds.push(res.rows[0].warehouse_id);
        }
        console.log(`✓ Seeded ${warehouseIds.length} warehouses`);

        // ================================
        // SUPPLIERS (10)
        // ================================
        const supplierData = [
            ["SteelCorp Ltd", "Raj Mehta", "raj@steelcorp.com", "9876543210"],
            ["OfficeMart", "Anita Shah", "anita@officemart.com", "9876543211"],
            ["ElectroWorld", "Vikas Patel", "vikas@electroworld.com", "9876543212"],
            ["PackRight Solutions", "Neha Gupta", "neha@packright.com", "9876543213"],
            ["ChemSupply Inc", "Arjun Reddy", "arjun@chemsupply.com", "9876543214"],
            ["HardwareHub", "Pooja Sharma", "pooja@hardwarehub.com", "9876543215"],
            ["TextilePro", "Karan Singh", "karan@textilepro.com", "9876543216"],
            ["AutoParts Direct", "Meera Joshi", "meera@autoparts.com", "9876543217"],
            ["SafetyFirst Gear", "Rohan Das", "rohan@safetyfirst.com", "9876543218"],
            ["BuildMate Supplies", "Sita Rao", "sita@buildmate.com", "9876543219"]
        ];

        const supplierIds = [];
        for (const [name, contact, email, phone] of supplierData) {
            const res = await client.query(
                `INSERT INTO suppliers (name, contact_person, email, phone)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (name) DO UPDATE SET contact_person = EXCLUDED.contact_person
                 RETURNING supplier_id`,
                [name, contact, email, phone]
            );
            supplierIds.push(res.rows[0].supplier_id);
        }
        console.log(`✓ Seeded ${supplierIds.length} suppliers`);

        // ================================
        // PRODUCTS (50)
        // ================================
        const productTemplates = [
            ["Steel Rod 10mm", "STL001", 0, "kg", 50],
            ["Steel Sheet 2mm", "STL002", 0, "kg", 100],
            ["Copper Wire", "COP001", 0, "kg", 30],
            ["Aluminum Bar", "ALM001", 0, "kg", 40],
            ["Office Chair", "CHR001", 1, "units", 10],
            ["Standing Desk", "DSK001", 1, "units", 5],
            ["LED Monitor 24in", "ELC001", 2, "units", 8],
            ["Keyboard Wireless", "ELC002", 2, "units", 15],
            ["Mouse Optical", "ELC003", 2, "units", 20],
            ["USB-C Cable", "ELC004", 2, "units", 50],
            ["Printer Paper A4", "OFF001", 3, "reams", 100],
            ["Ink Cartridge Black", "OFF002", 3, "units", 20],
            ["Cardboard Box Large", "PKG001", 4, "units", 200],
            ["Bubble Wrap Roll", "PKG002", 4, "rolls", 30],
            ["Packing Tape", "PKG003", 4, "rolls", 50],
            ["Acetone", "CHM001", 5, "liters", 20],
            ["Isopropyl Alcohol", "CHM002", 5, "liters", 25],
            ["Bolt M10", "HRD001", 6, "units", 500],
            ["Nut M10", "HRD002", 6, "units", 500],
            ["Washer M10", "HRD003", 6, "units", 300],
            ["Cotton Fabric", "TXT001", 7, "meters", 100],
            ["Polyester Blend", "TXT002", 7, "meters", 80],
            ["Brake Pad Set", "AUT001", 8, "sets", 15],
            ["Oil Filter", "AUT002", 8, "units", 25],
            ["Spark Plug", "AUT003", 8, "units", 40],
            ["Energy Drink 500ml", "FNB001", 9, "cases", 50],
            ["Bottled Water", "FNB002", 9, "cases", 100],
            ["Surgical Gloves", "MED001", 10, "boxes", 30],
            ["Face Masks N95", "MED002", 10, "boxes", 40],
            ["Hand Sanitizer 1L", "CLN001", 11, "bottles", 60],
            ["Disinfectant Spray", "CLN002", 11, "cans", 40],
            ["Safety Helmet", "SAF001", 12, "units", 20],
            ["Hi-Vis Vest", "SAF002", 12, "units", 25],
            ["Safety Goggles", "SAF003", 12, "units", 30],
            ["Wrench Set", "TLS001", 13, "sets", 10],
            ["Drill Machine", "TLS002", 13, "units", 5],
            ["PVC Pipe 2in", "PLB001", 14, "meters", 50],
            ["Pipe Fitting Elbow", "PLB002", 14, "units", 100],
            ["Circuit Breaker 20A", "ELT001", 15, "units", 25],
            ["Electrical Wire 2.5mm", "ELT002", 15, "meters", 200],
            ["Cement Bag 50kg", "BLD001", 16, "bags", 100],
            ["Sand Fine", "BLD002", 16, "tons", 10],
            ["Filing Cabinet", "FUR001", 17, "units", 5],
            ["Bookshelf Metal", "FUR002", 17, "units", 3],
            ["Notebook A5", "STA001", 18, "units", 100],
            ["Ballpoint Pen Blue", "STA002", 18, "units", 200],
            ["Grease Multipurpose", "LUB001", 19, "kg", 20],
            ["Engine Oil 5W30", "LUB002", 19, "liters", 50],
            ["Hydraulic Fluid", "LUB003", 19, "liters", 30],
            ["Silicone Spray", "LUB004", 19, "cans", 40]
        ];

        const productIds = [];
        for (const [name, sku, catIdx, unit, reorder] of productTemplates) {
            const res = await client.query(
                `INSERT INTO products (name, sku, category_id, unit, reorder_level)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name
                 RETURNING product_id`,
                [name, sku, categoryIds[catIdx], unit, reorder]
            );
            productIds.push(res.rows[0].product_id);
        }
        console.log(`✓ Seeded ${productIds.length} products`);

        // ================================
        // SUPPLIER_PRODUCTS
        // ================================
        for (let i = 0; i < productIds.length; i++) {
            const supplierId = supplierIds[i % supplierIds.length];
            const price = (Math.random() * 500 + 10).toFixed(2);
            const leadTime = randInt(2, 14);
            await client.query(
                `INSERT INTO supplier_products (supplier_id, product_id, price, lead_time_days)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (supplier_id, product_id) DO UPDATE SET price = EXCLUDED.price`,
                [supplierId, productIds[i], price, leadTime]
            );
        }
        console.log(`✓ Seeded supplier_products links`);

        // ================================
        // INVENTORY (each product in 1-3 random warehouses)
        // ================================
        let inventoryCount = 0;
        for (const prodId of productIds) {
            const numWarehouses = randInt(1, 3);
            const shuffled = [...warehouseIds].sort(() => Math.random() - 0.5);
            for (let i = 0; i < numWarehouses; i++) {
                const qty = randInt(0, 500);
                await client.query(
                    `INSERT INTO inventory (product_id, warehouse_id, quantity)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (product_id, warehouse_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
                    [prodId, shuffled[i], qty]
                );
                inventoryCount++;
            }
        }
        console.log(`✓ Seeded ${inventoryCount} inventory records`);

        // ================================
        // RECEIPTS (30 incoming)
        // ================================
        for (let i = 0; i < 30; i++) {
            const prodId = pick(productIds);
            const whId = pick(warehouseIds);
            const suppId = pick(supplierIds);
            const qty = randInt(10, 200);
            const receivedAt = randDate(30);
            await client.query(
                `INSERT INTO receipts (product_id, warehouse_id, supplier_id, quantity, received_at)
                 VALUES ($1, $2, $3, $4, $5)`,
                [prodId, whId, suppId, qty, receivedAt]
            );
        }
        console.log(`✓ Seeded 30 receipts`);

        // ================================
        // DELIVERIES (25 outgoing)
        // ================================
        const customers = ["Acme Corp", "GlobalTech", "Metro Industries", "SunRise Ltd", "Peak Solutions",
                           "Nova Enterprises", "Zenith Co", "Apex Manufacturing", "Titan Group", "Orbit Systems"];
        for (let i = 0; i < 25; i++) {
            const prodId = pick(productIds);
            const whId = pick(warehouseIds);
            const qty = randInt(5, 100);
            const deliveredAt = randDate(30);
            await client.query(
                `INSERT INTO deliveries (product_id, warehouse_id, customer_name, quantity, delivered_at)
                 VALUES ($1, $2, $3, $4, $5)`,
                [prodId, whId, pick(customers), qty, deliveredAt]
            );
        }
        console.log(`✓ Seeded 25 deliveries`);

        // ================================
        // TRANSFERS (15)
        // ================================
        for (let i = 0; i < 15; i++) {
            const prodId = pick(productIds);
            const fromWh = pick(warehouseIds);
            let toWh = pick(warehouseIds);
            while (toWh === fromWh) toWh = pick(warehouseIds);
            const qty = randInt(5, 50);
            const transferredAt = randDate(30);
            await client.query(
                `INSERT INTO transfers (product_id, from_warehouse, to_warehouse, quantity, transferred_at)
                 VALUES ($1, $2, $3, $4, $5)`,
                [prodId, fromWh, toWh, qty, transferredAt]
            );
        }
        console.log(`✓ Seeded 15 transfers`);

        // ================================
        // STOCK LEDGER (entries for all operations)
        // ================================
        // Receipts
        const receipts = await client.query("SELECT receipt_id, product_id, warehouse_id, quantity FROM receipts");
        for (const r of receipts.rows) {
            await client.query(
                `INSERT INTO stock_ledger (product_id, warehouse_id, operation_type, quantity, reference_id, created_at)
                 VALUES ($1, $2, 'RECEIPT', $3, $4, NOW() - interval '1 day' * $5)`,
                [r.product_id, r.warehouse_id, r.quantity, r.receipt_id, randInt(0, 30)]
            );
        }
        // Deliveries
        const deliveries = await client.query("SELECT delivery_id, product_id, warehouse_id, quantity FROM deliveries");
        for (const d of deliveries.rows) {
            await client.query(
                `INSERT INTO stock_ledger (product_id, warehouse_id, operation_type, quantity, reference_id, created_at)
                 VALUES ($1, $2, 'DELIVERY', $3, $4, NOW() - interval '1 day' * $5)`,
                [d.product_id, d.warehouse_id, d.quantity, d.delivery_id, randInt(0, 30)]
            );
        }
        // Transfers
        const transfers = await client.query("SELECT transfer_id, product_id, from_warehouse, to_warehouse, quantity FROM transfers");
        for (const t of transfers.rows) {
            await client.query(
                `INSERT INTO stock_ledger (product_id, warehouse_id, operation_type, quantity, reference_id, created_at)
                 VALUES ($1, $2, 'TRANSFER', $3, $4, NOW() - interval '1 day' * $5)`,
                [t.product_id, t.from_warehouse, t.quantity, t.transfer_id, randInt(0, 30)]
            );
        }
        console.log(`✓ Seeded stock_ledger entries`);

        // ================================
        // STOCK ADJUSTMENTS (10)
        // ================================
        const reasons = ["Damaged goods", "Inventory recount", "Shrinkage", "Quality control", "Expired items"];
        for (let i = 0; i < 10; i++) {
            const prodId = pick(productIds);
            const whId = pick(warehouseIds);
            const adj = randInt(-20, 20);
            await client.query(
                `INSERT INTO stock_adjustments (product_id, warehouse_id, adjustment, reason, adjusted_at)
                 VALUES ($1, $2, $3, $4, NOW() - interval '1 day' * $5)`,
                [prodId, whId, adj, pick(reasons), randInt(0, 30)]
            );
        }
        console.log(`✓ Seeded 10 stock adjustments`);

        await client.query("COMMIT");
        console.log("\n🎉 Database seeded successfully!");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Seed failed:", err.message);
    } finally {
        client.release();
        pool.end();
    }
}

seed();
