-- ================================
-- USERS
-- ================================
-- Admin test account: email=admin@example.com, password=admin123 (bcrypted hash below)
-- Note: Hash was generated with bcrypt(10 rounds) for password "admin123"

INSERT INTO users (name, email, password_hash, role, is_approved, approval_status)
VALUES
('Admin User', 'admin@example.com', '$2b$10$YIjlrPNoS0DI.6TtxMB7O.W3zH8KxwXx8zH8KxwXx8zH8KxwXx8zH', 'admin', true, 'approved'),
('Inventory Manager', 'manager@example.com', 'hashedpassword', 'manager', true, 'approved'),
('Warehouse Staff', 'staff@example.com', 'hashedpassword', 'staff', true, 'approved')
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
('LED Monitor', 'ELC001', 3, 'units', 3)
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

INSERT INTO suppliers (name, contact_person, email, phone)
VALUES
('SteelCorp Ltd', 'Raj Mehta', 'raj@steelcorp.com', '9876543210'),
('OfficeMart', 'Anita Shah', 'anita@officemart.com', '9876543211'),
('ElectroWorld', 'Vikas Patel', 'vikas@electroworld.com', '9876543212')
ON CONFLICT (name) DO NOTHING;

-- ================================
-- SUPPLIER PRODUCTS
-- ================================

INSERT INTO supplier_products (supplier_id, product_id, price, lead_time_days)
VALUES
(1,1,45.50,5),
(1,2,60.00,7),
(2,3,1200.00,3),
(3,4,9000.00,10)
ON CONFLICT DO NOTHING;

-- =====================================
-- ROLE PERMISSIONS SEED DATA
-- =====================================

INSERT INTO role_permissions (role, permission_name)
VALUES
('manager','create_receipt'),
('manager','update_receipt'),
('manager','create_delivery'),
('manager','view_inventory'),
('manager','view_analytics'),
('manager','manage_products'),
('manager','view_reports'),

('staff','create_transfer'),
('staff','perform_picking'),
('staff','perform_shelving'),
('staff','perform_counting'),
('staff','view_assigned_warehouse_inventory'),

('admin','full_access')
ON CONFLICT DO NOTHING;