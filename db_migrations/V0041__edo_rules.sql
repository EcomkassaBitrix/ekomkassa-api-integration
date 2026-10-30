CREATE TABLE IF NOT EXISTS t_p25765938_ekomkassa_api_integr.edo_rules (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category_id TEXT NOT NULL DEFAULT '0',
  stage_id TEXT,
  template_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  pick TEXT NOT NULL DEFAULT 'all',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE t_p25765938_ekomkassa_api_integr.edo_requests ADD COLUMN IF NOT EXISTS rule_id INTEGER;
ALTER TABLE t_p25765938_ekomkassa_api_integr.edo_requests ADD COLUMN IF NOT EXISTS rule_name TEXT;