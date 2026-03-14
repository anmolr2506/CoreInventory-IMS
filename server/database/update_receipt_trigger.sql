-- Update receipt trigger to set reference_id in stock_ledger
DROP TRIGGER IF EXISTS receipt_inventory_trigger ON receipts;

CREATE OR REPLACE FUNCTION update_inventory_on_receipt()
RETURNS TRIGGER AS $$
BEGIN
INSERT INTO inventory(product_id, warehouse_id, quantity)
VALUES (NEW.product_id, NEW.warehouse_id, NEW.quantity)
ON CONFLICT(product_id, warehouse_id)
DO UPDATE SET quantity = inventory.quantity + NEW.quantity;

INSERT INTO stock_ledger(product_id, warehouse_id, operation_type, quantity, reference_id)
VALUES (NEW.product_id, NEW.warehouse_id, 'RECEIPT', NEW.quantity, NEW.receipt_id);

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER receipt_inventory_trigger
AFTER INSERT ON receipts
FOR EACH ROW
EXECUTE FUNCTION update_inventory_on_receipt();
