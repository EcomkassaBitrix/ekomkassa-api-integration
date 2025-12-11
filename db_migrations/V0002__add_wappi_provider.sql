-- Добавляем провайдер Wappi для универсальной отправки
INSERT INTO providers (provider_code, provider_name, provider_type, is_active) VALUES
('wappi', 'Wappi Universal', 'multi', true)
ON CONFLICT (provider_code) DO UPDATE 
SET provider_name = EXCLUDED.provider_name, 
    provider_type = EXCLUDED.provider_type,
    is_active = EXCLUDED.is_active;