-- =====================================
-- CORE INVENTORY SCHEMA (clean order)
-- =====================================

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('manager','staff','admin','pending_user')),
    reset_otp VARCHAR(10),
    reset_otp_expiry TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    is_approved BOOLEAN DEFAULT false,
    approval_status VARCHAR(30) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approved_by INT,
    approved_at TIMESTAMP,
    requested_role VARCHAR(30) NOT NULL DEFAULT 'staff' CHECK (requested_role IN ('manager', 'staff')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS warehouses (
    warehouse_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    short_code VARCHAR(10) NOT NULL UNIQUE,
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

CREATE TABLE IF NOT EXISTS products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    category_id INT NOT NULL,
    unit VARCHAR(20) NOT NULL,
    reorder_level INT DEFAULT 0 CHECK (reorder_level >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_product_category
        FOREIGN KEY (category_id)
        REFERENCES categories(category_id)
        ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS inventory (
    inventory_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    warehouse_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_inventory_product
        FOREIGN KEY (product_id)
        REFERENCES products(product_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_inventory_warehouse
        FOREIGN KEY (warehouse_id)
        REFERENCES warehouses(warehouse_id)
        ON DELETE CASCADE,

    CONSTRAINT unique_product_warehouse
        UNIQUE (product_id, warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_product_warehouse
ON inventory(product_id, warehouse_id);

CREATE TABLE IF NOT EXISTS receipts (
    receipt_id SERIAL PRIMARY KEY,
    reference_number VARCHAR(50),
    product_id INT NOT NULL,
    warehouse_id INT NOT NULL,
    supplier_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) DEFAULT 0,
    received_by INT,
    schedule_date DATE,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) DEFAULT 'Received',

    CONSTRAINT fk_receipt_product
        FOREIGN KEY (product_id)
        REFERENCES products(product_id),

    CONSTRAINT fk_receipt_warehouse
        FOREIGN KEY (warehouse_id)
        REFERENCES warehouses(warehouse_id),

    CONSTRAINT fk_receipt_supplier
        FOREIGN KEY (supplier_id)
        REFERENCES suppliers(supplier_id),

    CONSTRAINT fk_receipt_user
        FOREIGN KEY (received_by)
        REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS deliveries (
    delivery_id SERIAL PRIMARY KEY,
    reference_number VARCHAR(50),
    product_id INT NOT NULL,
    warehouse_id INT NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) DEFAULT 0,
    delivered_by INT,
    schedule_date DATE,
    delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) DEFAULT 'Delivered',

    CONSTRAINT fk_delivery_product
        FOREIGN KEY (product_id)
        REFERENCES products(product_id),

    CONSTRAINT fk_delivery_warehouse
        FOREIGN KEY (warehouse_id)
        REFERENCES warehouses(warehouse_id),

    CONSTRAINT fk_delivery_user
        FOREIGN KEY (delivered_by)
        REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS transfers (
    transfer_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    from_warehouse INT NOT NULL,
    to_warehouse INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    transferred_by INT,
    transferred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) DEFAULT 'Pending',

    CONSTRAINT fk_transfer_product
        FOREIGN KEY (product_id)
        REFERENCES products(product_id),

    CONSTRAINT fk_transfer_from
        FOREIGN KEY (from_warehouse)
        REFERENCES warehouses(warehouse_id),

    CONSTRAINT fk_transfer_to
        FOREIGN KEY (to_warehouse)
        REFERENCES warehouses(warehouse_id),

    CONSTRAINT fk_transfer_user
        FOREIGN KEY (transferred_by)
        REFERENCES users(user_id),

    CONSTRAINT warehouse_check
        CHECK (from_warehouse <> to_warehouse)
);

CREATE TABLE IF NOT EXISTS stock_adjustments (
    adjustment_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    warehouse_id INT NOT NULL,
    adjustment INT NOT NULL,
    reason TEXT NOT NULL,
    adjusted_by INT,
    adjusted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_adjust_product
        FOREIGN KEY (product_id)
        REFERENCES products(product_id),

    CONSTRAINT fk_adjust_warehouse
        FOREIGN KEY (warehouse_id)
        REFERENCES warehouses(warehouse_id),

    CONSTRAINT fk_adjust_user
        FOREIGN KEY (adjusted_by)
        REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS stock_ledger (
    ledger_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    warehouse_id INT NOT NULL,
    operation_type VARCHAR(30) NOT NULL
        CHECK (operation_type IN ('RECEIPT','DELIVERY','TRANSFER','ADJUSTMENT')),
    quantity INT NOT NULL,
    reference_id INT,
    idempotency_key TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ledger_product
        FOREIGN KEY (product_id)
        REFERENCES products(product_id),

    CONSTRAINT fk_ledger_warehouse
        FOREIGN KEY (warehouse_id)
        REFERENCES warehouses(warehouse_id)
);

CREATE TABLE IF NOT EXISTS supplier_products (
    supplier_id INT REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
    product_id INT REFERENCES products(product_id) ON DELETE CASCADE,
    price NUMERIC(10,2),
    lead_time_days INT,

    PRIMARY KEY (supplier_id, product_id)
);

CREATE TABLE IF NOT EXISTS role_permissions (
    permission_id SERIAL PRIMARY KEY,
    role VARCHAR(30) NOT NULL,
    permission_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS warehouse_assignments (
    assignment_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    warehouse_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_assignment_user
    FOREIGN KEY (user_id)
    REFERENCES users(user_id) ON DELETE CASCADE,

    CONSTRAINT fk_assignment_warehouse
    FOREIGN KEY (warehouse_id)
    REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,

    CONSTRAINT unique_user_warehouse
    UNIQUE (user_id, warehouse_id)
);

CREATE TABLE IF NOT EXISTS locations (
    location_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    short_code VARCHAR(10) NOT NULL,
    warehouse_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_location_warehouse
    FOREIGN KEY (warehouse_id)
    REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,

    CONSTRAINT unique_location_code_per_warehouse
    UNIQUE (warehouse_id, short_code)
);

-- Backward-compatible guards for old databases.
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS reset_otp VARCHAR(10);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS reset_otp_expiry TIMESTAMP;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) DEFAULT 'pending';
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS approved_by INT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS requested_role VARCHAR(30) DEFAULT 'staff';

ALTER TABLE IF EXISTS receipts ADD COLUMN IF NOT EXISTS reference_number VARCHAR(50);
ALTER TABLE IF EXISTS receipts ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE IF EXISTS receipts ADD COLUMN IF NOT EXISTS schedule_date DATE;
ALTER TABLE IF EXISTS receipts ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Received';

ALTER TABLE IF EXISTS deliveries ADD COLUMN IF NOT EXISTS reference_number VARCHAR(50);
ALTER TABLE IF EXISTS deliveries ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE IF EXISTS deliveries ADD COLUMN IF NOT EXISTS schedule_date DATE;
ALTER TABLE IF EXISTS deliveries ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Delivered';

ALTER TABLE IF EXISTS transfers ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Pending';
ALTER TABLE IF EXISTS stock_ledger ADD COLUMN IF NOT EXISTS idempotency_key TEXT;