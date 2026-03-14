-- ============================
-- CLEAN OLD TRIGGERS
-- ============================

DROP TRIGGER IF EXISTS receipt_inventory_trigger ON receipts;
DROP TRIGGER IF EXISTS delivery_inventory_trigger ON deliveries;
DROP TRIGGER IF EXISTS transfer_inventory_trigger ON transfers;
DROP TRIGGER IF EXISTS adjustment_inventory_trigger ON stock_adjustments;

DROP FUNCTION IF EXISTS update_inventory_on_receipt;
DROP FUNCTION IF EXISTS update_inventory_on_delivery;
DROP FUNCTION IF EXISTS update_inventory_on_transfer;
DROP FUNCTION IF EXISTS update_inventory_on_adjustment;

-- ============================
-- RECEIPT TRIGGER (INCREASE STOCK)
-- ============================

CREATE OR REPLACE FUNCTION update_inventory_on_receipt()
RETURNS TRIGGER AS $$
BEGIN

INSERT INTO inventory(product_id, warehouse_id, quantity)
VALUES (NEW.product_id, NEW.warehouse_id, NEW.quantity)

ON CONFLICT(product_id, warehouse_id)
DO UPDATE
SET quantity = inventory.quantity + NEW.quantity;

INSERT INTO stock_ledger(product_id, warehouse_id, operation_type, quantity)
VALUES (NEW.product_id, NEW.warehouse_id, 'RECEIPT', NEW.quantity);

RETURN NEW;

END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER receipt_inventory_trigger
AFTER INSERT ON receipts
FOR EACH ROW
EXECUTE FUNCTION update_inventory_on_receipt();


-- ============================
-- DELIVERY TRIGGER (DECREASE STOCK)
-- ============================

CREATE OR REPLACE FUNCTION update_inventory_on_delivery()
RETURNS TRIGGER AS $$
BEGIN

UPDATE inventory
SET quantity = quantity - NEW.quantity
WHERE product_id = NEW.product_id
AND warehouse_id = NEW.warehouse_id;

INSERT INTO stock_ledger(product_id, warehouse_id, operation_type, quantity)
VALUES (NEW.product_id, NEW.warehouse_id, 'DELIVERY', NEW.quantity);

RETURN NEW;

END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER delivery_inventory_trigger
AFTER INSERT ON deliveries
FOR EACH ROW
EXECUTE FUNCTION update_inventory_on_delivery();


-- ============================
-- TRANSFER TRIGGER (MOVE STOCK)
-- ============================

CREATE OR REPLACE FUNCTION update_inventory_on_transfer()
RETURNS TRIGGER AS $$
BEGIN

-- reduce stock in source warehouse
UPDATE inventory
SET quantity = quantity - NEW.quantity
WHERE product_id = NEW.product_id
AND warehouse_id = NEW.from_warehouse;

-- increase stock in destination warehouse
INSERT INTO inventory(product_id, warehouse_id, quantity)
VALUES (NEW.product_id, NEW.to_warehouse, NEW.quantity)

ON CONFLICT(product_id, warehouse_id)
DO UPDATE
SET quantity = inventory.quantity + NEW.quantity;

INSERT INTO stock_ledger(product_id, warehouse_id, operation_type, quantity)
VALUES (NEW.product_id, NEW.from_warehouse, 'TRANSFER', NEW.quantity);

RETURN NEW;

END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER transfer_inventory_trigger
AFTER INSERT ON transfers
FOR EACH ROW
EXECUTE FUNCTION update_inventory_on_transfer();


-- ============================
-- STOCK ADJUSTMENT TRIGGER
-- ============================

CREATE OR REPLACE FUNCTION update_inventory_on_adjustment()
RETURNS TRIGGER AS $$
BEGIN

UPDATE inventory
SET quantity = quantity + NEW.adjustment
WHERE product_id = NEW.product_id
AND warehouse_id = NEW.warehouse_id;

INSERT INTO stock_ledger(product_id, warehouse_id, operation_type, quantity)
VALUES (NEW.product_id, NEW.warehouse_id, 'ADJUSTMENT', NEW.adjustment);

RETURN NEW;

END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER adjustment_inventory_trigger
AFTER INSERT ON stock_adjustments
FOR EACH ROW
EXECUTE FUNCTION update_inventory_on_adjustment();

-- ====================================
-- PREVENT NEGATIVE STOCK
-- ====================================

DROP TRIGGER IF EXISTS check_stock_before_delivery ON deliveries;
CREATE OR REPLACE FUNCTION prevent_negative_stock()
RETURNS TRIGGER AS $$
DECLARE
current_stock INT;
BEGIN

SELECT quantity INTO current_stock
FROM inventory
WHERE product_id = NEW.product_id
AND warehouse_id = NEW.warehouse_id;

IF current_stock IS NULL THEN
RAISE EXCEPTION 'No inventory record found for this product in warehouse';
END IF;

IF current_stock < NEW.quantity THEN
RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %',
current_stock, NEW.quantity;
END IF;

RETURN NEW;

END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_stock_before_delivery ON deliveries;
CREATE TRIGGER check_stock_before_delivery
BEFORE INSERT ON deliveries
FOR EACH ROW
EXECUTE FUNCTION prevent_negative_stock();