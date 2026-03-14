-- Update delivery trigger to set reference_id in stock_ledger
DROP TRIGGER IF EXISTS delivery_inventory_trigger ON deliveries;

CREATE OR REPLACE FUNCTION update_inventory_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
UPDATE inventory
SET quantity = quantity - NEW.quantity
WHERE product_id = NEW.product_id
AND warehouse_id = NEW.warehouse_id;

INSERT INTO stock_ledger(product_id, warehouse_id, operation_type, quantity, reference_id)
VALUES (NEW.product_id, NEW.warehouse_id, 'DELIVERY', NEW.quantity, NEW.delivery_id);

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER delivery_inventory_trigger
AFTER INSERT ON deliveries
FOR EACH ROW
EXECUTE FUNCTION update_inventory_on_delivery();
