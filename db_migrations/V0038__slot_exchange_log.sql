CREATE TABLE IF NOT EXISTS t_p25765938_ekomkassa_api_integr.slot_exchange (
  id BIGSERIAL PRIMARY KEY,
  parent_id BIGINT,
  direction VARCHAR(8) NOT NULL,
  kind VARCHAR(80) NOT NULL,
  deal_id VARCHAR(40) NOT NULL DEFAULT '',
  ok BOOLEAN NOT NULL DEFAULT TRUE,
  status INTEGER,
  summary TEXT NOT NULL DEFAULT '',
  request TEXT NOT NULL DEFAULT '',
  response TEXT NOT NULL DEFAULT '',
  source_ip VARCHAR(64) NOT NULL DEFAULT '',
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS slot_exchange_parent_idx ON t_p25765938_ekomkassa_api_integr.slot_exchange (parent_id);
CREATE INDEX IF NOT EXISTS slot_exchange_created_idx ON t_p25765938_ekomkassa_api_integr.slot_exchange (created_at DESC);