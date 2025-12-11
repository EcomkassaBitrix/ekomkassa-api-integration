-- Create messages table for guaranteed delivery
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(100) UNIQUE NOT NULL,
    provider VARCHAR(50) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    message_text TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending',
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    last_attempt_at TIMESTAMP,
    last_error TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_message_id ON messages(message_id);

-- Create delivery_attempts table for audit trail
CREATE TABLE IF NOT EXISTS delivery_attempts (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(100) NOT NULL,
    attempt_number INT NOT NULL,
    provider VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    response_code INT,
    response_body TEXT,
    error_message TEXT,
    duration_ms INT,
    attempted_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_attempts_message_id ON delivery_attempts(message_id);
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_attempted_at ON delivery_attempts(attempted_at DESC);

-- Create providers table for provider configuration
CREATE TABLE IF NOT EXISTS providers (
    id SERIAL PRIMARY KEY,
    provider_code VARCHAR(50) UNIQUE NOT NULL,
    provider_name VARCHAR(100) NOT NULL,
    provider_type VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_providers_active ON providers(is_active);

-- Insert default providers
INSERT INTO providers (provider_code, provider_name, provider_type, is_active) VALUES
('sms_gateway', 'SMS Gateway', 'sms', true),
('whatsapp_business', 'WhatsApp Business', 'whatsapp', true),
('telegram_bot', 'Telegram Bot', 'telegram', true),
('push_service', 'Push Notifications', 'push', false),
('email_service', 'Email Service', 'email', true)
ON CONFLICT (provider_code) DO NOTHING;

-- Create api_keys table for authentication
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    key_name VARCHAR(100) NOT NULL,
    api_key VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(api_key);

-- Insert default API keys for Ekomkassa
INSERT INTO api_keys (key_name, api_key, is_active) VALUES
('Ekomkassa Production', 'ek_live_j8h3k2n4m5p6q7r8', true),
('Ekomkassa Staging', 'ek_test_a1b2c3d4e5f6g7h8', true)
ON CONFLICT (api_key) DO NOTHING;