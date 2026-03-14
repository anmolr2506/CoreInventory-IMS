CREATE TABLE IF NOT EXISTS outbox_events (
    event_id UUID PRIMARY KEY,
    source_site_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_outbox_unsent
ON outbox_events(sent_at)
WHERE sent_at IS NULL;

CREATE TABLE IF NOT EXISTS inbox_events (
    event_id UUID NOT NULL,
    source_site_id VARCHAR(100) NOT NULL,
    received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, source_site_id)
);

