ALTER TABLE t_p25765938_ekomkassa_api_integr.auth_users ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE t_p25765938_ekomkassa_api_integr.auth_users ADD COLUMN IF NOT EXISTS is_owner BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE t_p25765938_ekomkassa_api_integr.auth_users ADD COLUMN IF NOT EXISTS invited_by INT;
ALTER TABLE t_p25765938_ekomkassa_api_integr.auth_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
ALTER TABLE t_p25765938_ekomkassa_api_integr.auth_users DROP CONSTRAINT IF EXISTS auth_users_phone_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_users_phone ON t_p25765938_ekomkassa_api_integr.auth_users (phone) WHERE phone <> '';
UPDATE t_p25765938_ekomkassa_api_integr.auth_users SET is_owner = true, name = 'Владелец' WHERE email = 'services@ecomkassa.ru';