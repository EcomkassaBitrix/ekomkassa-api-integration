ALTER TABLE t_p25765938_ekomkassa_api_integr.fns_applications
    ADD COLUMN IF NOT EXISTS last_polled_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_fns_app_poll ON t_p25765938_ekomkassa_api_integr.fns_applications (status, last_polled_at);