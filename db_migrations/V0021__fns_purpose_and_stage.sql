ALTER TABLE t_p25765938_ekomkassa_api_integr.fns_settings
    ADD COLUMN IF NOT EXISTS purpose_entity VARCHAR(20),
    ADD COLUMN IF NOT EXISTS purpose_field VARCHAR(100),
    ADD COLUMN IF NOT EXISTS purpose_values JSONB DEFAULT '{}';

ALTER TABLE t_p25765938_ekomkassa_api_integr.fns_applications
    ADD COLUMN IF NOT EXISTS purpose VARCHAR(30) DEFAULT 'InitialRegistration',
    ADD COLUMN IF NOT EXISTS stage VARCHAR(20) DEFAULT 'application';

CREATE INDEX IF NOT EXISTS idx_fns_app_deal_purpose ON t_p25765938_ekomkassa_api_integr.fns_applications (deal_id, purpose);