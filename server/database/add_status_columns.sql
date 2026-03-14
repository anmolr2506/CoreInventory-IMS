-- Add status columns for Kanban view
-- Receipt statuses: Pending, In Transit, Received
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Received';

-- Delivery statuses: Pending, Processing, Shipped, Delivered
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Delivered';

-- Update existing rows to have status
UPDATE receipts SET status = 'Received' WHERE status IS NULL;
UPDATE deliveries SET status = 'Delivered' WHERE status IS NULL;
