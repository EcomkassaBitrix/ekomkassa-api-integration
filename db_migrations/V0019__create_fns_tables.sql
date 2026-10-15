CREATE TABLE IF NOT EXISTS t_p25765938_ekomkassa_api_integr.fns_settings (
    id SERIAL PRIMARY KEY,
    connection_key VARCHAR(50) UNIQUE NOT NULL DEFAULT 'default',
    mapping_json JSONB DEFAULT '{}',
    result_link_field VARCHAR(100),
    result_rnm_field VARCHAR(100),
    sign_base_url VARCHAR(255),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p25765938_ekomkassa_api_integr.fns_applications (
    id SERIAL PRIMARY KEY,
    public_token VARCHAR(64) UNIQUE,
    deal_id VARCHAR(50) NOT NULL,
    company_id VARCHAR(50),
    contact_id VARCHAR(50),
    requisite_id VARCHAR(50),
    status VARCHAR(40),
    inn VARCHAR(20),
    company_name VARCHAR(500),
    serial_number VARCHAR(100),
    fn_number VARCHAR(50),
    model VARCHAR(200),
    full_address TEXT,
    install_place TEXT,
    fields_json JSONB,
    request_payload JSONB,
    ofd_application_id VARCHAR(64),
    document_id VARCHAR(64),
    signer_name VARCHAR(300),
    signer_position VARCHAR(300),
    rnm VARCHAR(50),
    status_reason TEXT,
    error_message TEXT,
    response_payload JSONB,
    source VARCHAR(30),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fns_app_deal ON t_p25765938_ekomkassa_api_integr.fns_applications (deal_id);
CREATE INDEX IF NOT EXISTS idx_fns_app_created ON t_p25765938_ekomkassa_api_integr.fns_applications (created_at DESC);

CREATE TABLE IF NOT EXISTS t_p25765938_ekomkassa_api_integr.fns_events (
    id SERIAL PRIMARY KEY,
    application_id INT NOT NULL,
    step VARCHAR(100) NOT NULL,
    ok BOOLEAN NOT NULL DEFAULT true,
    info TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fns_events_app ON t_p25765938_ekomkassa_api_integr.fns_events (application_id, id);

INSERT INTO t_p25765938_ekomkassa_api_integr.fns_settings (connection_key, mapping_json) VALUES ('default', '{"SerialNumber": {"mode": "CRM", "entity": "DEAL", "field": "UF_CRM_1723717747624", "value": ""}, "FnNumber": {"mode": "CRM", "entity": "DEAL", "field": "UF_CRM_1723717772996", "value": ""}, "InstallmentPlace": {"mode": "CRM", "entity": "DEAL", "field": "UF_CRM_1739366788405", "value": ""}, "FormatVersion": {"mode": "STATIC", "entity": "", "field": "", "value": "4"}}'::jsonb) ON CONFLICT DO NOTHING;