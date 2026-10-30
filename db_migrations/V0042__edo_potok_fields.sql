ALTER TABLE t_p25765938_ekomkassa_api_integr.edo_settings ADD COLUMN IF NOT EXISTS potok_token TEXT;
ALTER TABLE t_p25765938_ekomkassa_api_integr.edo_settings ADD COLUMN IF NOT EXISTS potok_token_at TIMESTAMP;
ALTER TABLE t_p25765938_ekomkassa_api_integr.edo_settings ADD COLUMN IF NOT EXISTS potok_doc_type INTEGER;
ALTER TABLE t_p25765938_ekomkassa_api_integr.edo_settings ADD COLUMN IF NOT EXISTS potok_sign_requested BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE t_p25765938_ekomkassa_api_integr.edo_rules ADD COLUMN IF NOT EXISTS potok_doc_type INTEGER;
UPDATE t_p25765938_ekomkassa_api_integr.edo_settings SET potok_base_url = 'https://lk.edo.ru/api/edo/v1' WHERE id = 1 AND (potok_base_url IS NULL OR potok_base_url = '');