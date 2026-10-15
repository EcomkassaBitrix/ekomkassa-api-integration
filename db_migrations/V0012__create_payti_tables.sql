CREATE TABLE IF NOT EXISTS t_p25765938_ekomkassa_api_integr.payti_mapping_settings (
    id SERIAL PRIMARY KEY,
    connection_key VARCHAR(50) UNIQUE NOT NULL DEFAULT 'default',
    mapping_json JSONB DEFAULT '{}',
    default_environment VARCHAR(10) DEFAULT 'test',
    default_registration_mode VARCHAR(1) DEFAULT 'A',
    mode_entity VARCHAR(30),
    mode_field VARCHAR(100),
    mode_value VARCHAR(255),
    result_login_field VARCHAR(100),
    result_password_field VARCHAR(100),
    result_store_field VARCHAR(100),
    updated_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p25765938_ekomkassa_api_integr.payti_registrations (
    id SERIAL PRIMARY KEY,
    connection_key VARCHAR(50) DEFAULT 'default',
    deal_id VARCHAR(50) NOT NULL,
    company_id VARCHAR(50),
    contact_id VARCHAR(50),
    requisite_id VARCHAR(50),
    environment VARCHAR(10),
    registration_mode VARCHAR(1),
    status VARCHAR(40),
    tax_id VARCHAR(20),
    login VARCHAR(255),
    firm_id VARCHAR(100),
    store_id VARCHAR(100),
    registrar_id VARCHAR(100),
    http_status INT,
    error_code VARCHAR(100),
    error_message TEXT,
    request_payload_masked JSONB,
    response_payload JSONB,
    source VARCHAR(30),
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    registered_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payti_reg_deal ON t_p25765938_ekomkassa_api_integr.payti_registrations (connection_key, deal_id, environment);
CREATE INDEX IF NOT EXISTS idx_payti_reg_created ON t_p25765938_ekomkassa_api_integr.payti_registrations (created_at DESC);

CREATE TABLE IF NOT EXISTS t_p25765938_ekomkassa_api_integr.payti_deal_passwords (
    deal_id VARCHAR(50) PRIMARY KEY,
    password VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO t_p25765938_ekomkassa_api_integr.payti_mapping_settings (connection_key) VALUES ('default') ON CONFLICT DO NOTHING;