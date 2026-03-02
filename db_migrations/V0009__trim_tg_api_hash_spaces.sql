UPDATE providers 
SET config = jsonb_set(config, '{tg_api_hash}', to_jsonb(trim(config->>'tg_api_hash')))
WHERE provider_type = 'telegram_otp' AND config->>'tg_api_hash' != trim(config->>'tg_api_hash');