-- ================================
-- USERS
-- ================================

INSERT INTO users (name, email, password_hash, role)
VALUES
('Admin User', 'admin@example.com', 'hashedpassword', 'admin'),
('Inventory Manager', 'manager@example.com', 'hashedpassword', 'manager'),
('Warehouse Staff', 'staff@example.com', 'hashedpassword', 'staff')
ON CONFLICT (email) DO NOTHING;



-- ================================
-- CATEGORIES
-- ================================

INSERT INTO categories (name, description)
VALUES
('Raw Material', 'Materials used for production'),
('Finished Goods', 'Products ready for sale'),
('Electronics', 'Electronic components')
ON CONFLICT (name) DO NOTHING;


-- ================================
-- WAREHOUSES
-- ================================

INSERT INTO warehouses (name, location)
VALUES
('Main Warehouse','Building A'),
('Production Floor','Building B'),
('Secondary Warehouse','Building C')
ON CONFLICT (name) DO NOTHING;


-- ================================
-- PRODUCTS
-- ================================

INSERT INTO products (name, sku, category_id, unit, reorder_level)
VALUES
('Steel Rod', 'STL001', 1, 'kg', 10),
('Steel Sheet', 'STL002', 1, 'kg', 20),
('Office Chair', 'CHR001', 2, 'units', 5),
('LED Monitor', 'ELC001', 3, 'units', 3),
('Desk', 'DESK001', 2, 'units', 5)
ON CONFLICT (sku) DO NOTHING;

-- ================================
-- INITIAL INVENTORY
-- ================================

INSERT INTO inventory (product_id, warehouse_id, quantity)
VALUES
(1, 1, 100),
(2, 1, 200),
(3, 2, 50),
(4, 1, 20)
ON CONFLICT (product_id, warehouse_id) DO NOTHING;

-- ================================
-- SUPPLIERS
-- ================================

INSERT INTO suppliers (name, contact_person, email, phone, address)
VALUES
('SteelCorp Ltd', 'Raj Mehta', 'raj@steelcorp.com', '9876543210', '123 Industrial Ave, Mumbai'),
('OfficeMart', 'Anita Shah', 'anita@officemart.com', '9876543211', '45 Office Park, Delhi'),
('ElectroWorld', 'Vikas Patel', 'vikas@electroworld.com', '9876543212', '78 Tech Hub, Bangalore')
ON CONFLICT (name) DO NOTHING;

-- ================================
-- SUPPLIER PRODUCTS
-- ================================

INSERT INTO supplier_products (supplier_id, product_id, price, lead_time_days)
VALUES
(1,1,45.50,5),
(1,2,60.00,7),
(2,3,1200.00,3),
(3,4,9000.00,10),
(2,5,3500.00,5)
ON CONFLICT DO NOTHING;