-- =====================================
-- CURRENT STOCK VIEW
-- =====================================
DROP VIEW IF EXISTS current_stock_view CASCADE;
CREATE VIEW current_stock_view AS
SELECT
p.product_id,
p.name AS product_name,
p.sku,
c.name AS category,
w.warehouse_id,
w.name AS warehouse_name,
i.quantity,
p.unit
FROM inventory i
JOIN products p ON i.product_id = p.product_id
JOIN warehouses w ON i.warehouse_id = w.warehouse_id
LEFT JOIN categories c ON p.category_id = c.category_id;

-- =====================================
-- LOW STOCK ALERT VIEW
-- =====================================

DROP VIEW IF EXISTS low_stock_alert CASCADE;
CREATE VIEW low_stock_alert AS
SELECT 
p.product_id,
p.name,
p.sku,
i.quantity,
p.reorder_level
FROM products p
JOIN inventory i
ON p.product_id = i.product_id
WHERE i.quantity <= p.reorder_level;

-- =====================================
-- TOTAL PRODUCTS
-- =====================================

DROP VIEW IF EXISTS total_products_view CASCADE;
CREATE VIEW total_products_view AS
SELECT COUNT(*) AS total_products
FROM products;

-- =====================================
-- TOTAL STOCK
-- =====================================

DROP VIEW IF EXISTS total_stock_view CASCADE;
CREATE VIEW total_stock_view AS
SELECT SUM(quantity) AS total_stock
FROM inventory;

-- =====================================
-- LOW STOCK ALERT VIEW
-- =====================================

DROP VIEW IF EXISTS low_stock_alert CASCADE;
CREATE VIEW low_stock_alert AS
SELECT 
p.product_id,
p.name AS product_name,
p.sku,
i.quantity,
p.reorder_level
FROM products p
JOIN inventory i
ON p.product_id = i.product_id
WHERE i.quantity <= p.reorder_level;

-- =====================================
-- OUT OF STOCK PRODUCTS VIEW
-- =====================================

DROP VIEW IF EXISTS out_of_stock_products CASCADE;

CREATE VIEW out_of_stock_products AS
SELECT 
p.product_id,
p.name AS product_name,
p.sku
FROM products p
JOIN inventory i
ON p.product_id = i.product_id
WHERE i.quantity = 0;

-- =====================================
-- WAREHOUSE STOCK VIEW
-- =====================================

DROP VIEW IF EXISTS warehouse_stock CASCADE;

CREATE VIEW warehouse_stock AS
SELECT 
w.warehouse_id,
w.name AS warehouse_name,
SUM(i.quantity) AS stock
FROM warehouses w
JOIN inventory i
ON w.warehouse_id = i.warehouse_id
GROUP BY w.warehouse_id, w.name;

-- =====================================
-- RECENT INVENTORY ACTIVITY
-- =====================================

DROP VIEW IF EXISTS recent_inventory_activity CASCADE;
DROP TABLE IF EXISTS recent_inventory_activity CASCADE;
CREATE VIEW recent_inventory_activity AS
SELECT
operation_type,
product_id,
warehouse_id,
quantity,
created_at
FROM stock_ledger
ORDER BY created_at DESC
LIMIT 10;

-- =====================================
-- INVENTORY VALUE PER PRODUCT
-- =====================================

DROP VIEW IF EXISTS product_inventory_value CASCADE;
CREATE VIEW product_inventory_value AS
SELECT
p.name AS product,
SUM(i.quantity) AS total_quantity,
sp.price,
SUM(i.quantity * sp.price) AS inventory_value
FROM inventory i
JOIN products p
ON i.product_id = p.product_id
JOIN supplier_products sp
ON p.product_id = sp.product_id
GROUP BY p.name, sp.price;

-- =====================================
-- TOTAL INVENTORY VALUE
-- =====================================

DROP VIEW IF EXISTS total_inventory_value CASCADE;
CREATE  VIEW total_inventory_value AS
SELECT
SUM(i.quantity * sp.price) AS total_inventory_value
FROM inventory i
JOIN supplier_products sp
ON i.product_id = sp.product_id;


-- =====================================
-- INVENTORY VALUE PER WAREHOUSE
-- =====================================

DROP VIEW IF EXISTS warehouse_inventory_value CASCADE;
CREATE VIEW warehouse_inventory_value AS
SELECT
w.name AS warehouse,
SUM(i.quantity * sp.price) AS warehouse_inventory_value
FROM inventory i
JOIN warehouses w
ON i.warehouse_id = w.warehouse_id
JOIN supplier_products sp
ON i.product_id = sp.product_id
GROUP BY w.name;

-- =====================================
-- PRODUCT DASHBOARD VIEW
-- =====================================

DROP VIEW IF EXISTS product_dashboard_view CASCADE;

CREATE VIEW product_dashboard_view AS
SELECT
p.product_id,
p.name AS product_name,
p.sku,

-- total stock across warehouses
COALESCE(SUM(i.quantity),0) AS total_stock,

-- inventory value
COALESCE(SUM(i.quantity * sp.price),0) AS inventory_value,

-- low stock flag
CASE
WHEN COALESCE(SUM(i.quantity),0) <= p.reorder_level
THEN TRUE
ELSE FALSE
END AS low_stock,

-- number of warehouses storing product
COUNT(DISTINCT i.warehouse_id) AS warehouses

FROM products p

LEFT JOIN inventory i
ON p.product_id = i.product_id

LEFT JOIN supplier_products sp
ON p.product_id = sp.product_id

GROUP BY
p.product_id,
p.name,
p.sku,
p.reorder_level;