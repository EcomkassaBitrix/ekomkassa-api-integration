CREATE TABLE IF NOT EXISTS tg_otp_sessions (
    id SERIAL PRIMARY KEY,
    provider_code VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    phone_code_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '10 minutes')
);