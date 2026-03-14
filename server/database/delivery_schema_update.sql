-- Add columns for multi-product delivery with reference and pricing
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS reference_number VARCHAR(50);
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS schedule_date DATE;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2);
