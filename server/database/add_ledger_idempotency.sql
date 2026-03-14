ALTER TABLE stock_ledger
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_ledger_idempotency_key
ON stock_ledger(idempotency_key)
WHERE idempotency_key IS NOT NULL;

