-- Inventory indexes

CREATE INDEX IF NOT EXISTS idx_inventory_product
ON inventory(product_id);

CREATE INDEX IF NOT EXISTS idx_inventory_warehouse
ON inventory(warehouse_id);

CREATE INDEX IF NOT EXISTS idx_inventory_product_warehouse
ON inventory(product_id, warehouse_id);

-- Ledger indexes

CREATE INDEX IF NOT EXISTS idx_ledger_product
ON stock_ledger(product_id);

CREATE INDEX IF NOT EXISTS idx_ledger_warehouse
ON stock_ledger(warehouse_id);

CREATE INDEX IF NOT EXISTS idx_ledger_operation
ON stock_ledger(operation_type);

CREATE INDEX IF NOT EXISTS idx_ledger_time
ON stock_ledger(created_at);

CREATE INDEX IF NOT EXISTS idx_products_sku
ON products(sku);

CREATE INDEX IF NOT EXISTS idx_products_reorder
ON products(reorder_level);