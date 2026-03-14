-- Add columns for multi-product receipt with reference and pricing
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS reference_number VARCHAR(50);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS schedule_date DATE;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2);

-- Update stock_ledger trigger to set reference_id (receipt_id) for audit
-- The trigger function is updated in a separate migration
