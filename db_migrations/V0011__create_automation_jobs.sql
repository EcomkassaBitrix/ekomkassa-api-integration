CREATE TABLE IF NOT EXISTS t_p25765938_ekomkassa_api_integr.automation_jobs (
    id SERIAL PRIMARY KEY,
    kind VARCHAR(20) NOT NULL,
    deal_id VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'received',
    raw_payload TEXT,
    account_login VARCHAR(255),
    result TEXT,
    last_error TEXT,
    attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_automation_jobs_kind ON t_p25765938_ekomkassa_api_integr.automation_jobs (kind, created_at DESC);