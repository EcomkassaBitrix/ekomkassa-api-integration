CREATE TABLE IF NOT EXISTS t_p25765938_ekomkassa_api_integr.auth_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p25765938_ekomkassa_api_integr.auth_codes (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    code_hash VARCHAR(64) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_codes_user ON t_p25765938_ekomkassa_api_integr.auth_codes (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS t_p25765938_ekomkassa_api_integr.auth_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

INSERT INTO t_p25765938_ekomkassa_api_integr.auth_users (email, phone)
VALUES ('services@ecomkassa.ru', '79689363395')
ON CONFLICT (email) DO NOTHING;