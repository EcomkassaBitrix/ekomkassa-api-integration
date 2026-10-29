CREATE TABLE IF NOT EXISTS t_p25765938_ekomkassa_api_integr.hook_log (
    id SERIAL PRIMARY KEY,
    action VARCHAR(30) NOT NULL,
    deal_id VARCHAR(50),
    http_method VARCHAR(10),
    params_masked TEXT,
    key_given BOOLEAN NOT NULL DEFAULT false,
    result_status INT,
    result_text TEXT,
    source_ip VARCHAR(64),
    user_agent VARCHAR(200),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hook_log_created ON t_p25765938_ekomkassa_api_integr.hook_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hook_log_deal ON t_p25765938_ekomkassa_api_integr.hook_log (deal_id);