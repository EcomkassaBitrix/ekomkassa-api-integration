CREATE TABLE IF NOT EXISTS t_p25765938_ekomkassa_api_integr.admin_notifications (
    id SERIAL PRIMARY KEY,
    kind VARCHAR(20) NOT NULL,
    deal_id VARCHAR(50),
    status VARCHAR(40),
    message_text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMP,
    tries INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_unsent ON t_p25765938_ekomkassa_api_integr.admin_notifications (id) WHERE sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_admin_notifications_dedupe ON t_p25765938_ekomkassa_api_integr.admin_notifications (kind, deal_id, status, created_at DESC);