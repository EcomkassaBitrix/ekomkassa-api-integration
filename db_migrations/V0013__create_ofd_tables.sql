CREATE TABLE IF NOT EXISTS t_p25765938_ekomkassa_api_integr.ofd_settings (
    id SERIAL PRIMARY KEY,
    connection_key VARCHAR(50) UNIQUE NOT NULL DEFAULT 'default',
    mapping_json JSONB DEFAULT '{}',
    result_agreement_field VARCHAR(100),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p25765938_ekomkassa_api_integr.ofd_registrations (
    id SERIAL PRIMARY KEY,
    deal_id VARCHAR(50) NOT NULL,
    company_id VARCHAR(50),
    contact_id VARCHAR(50),
    requisite_id VARCHAR(50),
    status VARCHAR(40),
    inn VARCHAR(20),
    email VARCHAR(255),
    agreement_id VARCHAR(100),
    http_status INT,
    error_code VARCHAR(100),
    error_message TEXT,
    request_payload JSONB,
    response_payload JSONB,
    source VARCHAR(30),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ofd_reg_deal ON t_p25765938_ekomkassa_api_integr.ofd_registrations (deal_id);
CREATE INDEX IF NOT EXISTS idx_ofd_reg_created ON t_p25765938_ekomkassa_api_integr.ofd_registrations (created_at DESC);

INSERT INTO t_p25765938_ekomkassa_api_integr.ofd_settings (connection_key) VALUES ('default') ON CONFLICT DO NOTHING;