ALTER TABLE t_p25765938_ekomkassa_api_integr.ofd_registrations ADD COLUMN IF NOT EXISTS attempt INT DEFAULT 1;
ALTER TABLE t_p25765938_ekomkassa_api_integr.ofd_registrations ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP;
ALTER TABLE t_p25765938_ekomkassa_api_integr.ofd_registrations ADD COLUMN IF NOT EXISTS retry_done BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_ofd_reg_retry ON t_p25765938_ekomkassa_api_integr.ofd_registrations (next_retry_at) WHERE retry_done = FALSE AND next_retry_at IS NOT NULL;