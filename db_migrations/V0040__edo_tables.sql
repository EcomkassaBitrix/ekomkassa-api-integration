CREATE TABLE IF NOT EXISTS t_p25765938_ekomkassa_api_integr.edo_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  bitrix_webhook_url TEXT,
  edo_field TEXT,
  diadoc_value TEXT DEFAULT 'Диадок',
  potok_value TEXT DEFAULT 'Поток',
  file_format TEXT NOT NULL DEFAULT 'pdf',
  diadoc_env TEXT NOT NULL DEFAULT 'test',
  diadoc_client_id TEXT,
  diadoc_login TEXT,
  diadoc_password TEXT,
  diadoc_box_id TEXT,
  potok_env TEXT NOT NULL DEFAULT 'test',
  potok_base_url TEXT,
  potok_login TEXT,
  potok_password TEXT,
  potok_org_id TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
INSERT INTO t_p25765938_ekomkassa_api_integr.edo_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS t_p25765938_ekomkassa_api_integr.edo_templates (
  id SERIAL PRIMARY KEY,
  template_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  doc_kind TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p25765938_ekomkassa_api_integr.edo_requests (
  id SERIAL PRIMARY KEY,
  deal_id TEXT NOT NULL,
  deal_title TEXT,
  provider TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  error TEXT,
  source TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_edo_requests_deal ON t_p25765938_ekomkassa_api_integr.edo_requests (deal_id, id DESC);

CREATE TABLE IF NOT EXISTS t_p25765938_ekomkassa_api_integr.edo_documents (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL,
  deal_id TEXT NOT NULL,
  bitrix_doc_id TEXT NOT NULL,
  provider TEXT,
  template_id TEXT,
  title TEXT,
  number TEXT,
  file_name TEXT,
  file_url TEXT,
  file_size INTEGER,
  status TEXT NOT NULL DEFAULT 'found',
  external_id TEXT,
  error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_edo_documents_unique ON t_p25765938_ekomkassa_api_integr.edo_documents (deal_id, bitrix_doc_id);

CREATE TABLE IF NOT EXISTS t_p25765938_ekomkassa_api_integr.edo_events (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL,
  document_id INTEGER,
  step TEXT NOT NULL,
  ok BOOLEAN NOT NULL DEFAULT TRUE,
  info TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_edo_events_req ON t_p25765938_ekomkassa_api_integr.edo_events (request_id, id);