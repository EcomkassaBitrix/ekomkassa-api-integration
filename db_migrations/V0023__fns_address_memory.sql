CREATE TABLE IF NOT EXISTS t_p25765938_ekomkassa_api_integr.fns_address_memory (
    id SERIAL PRIMARY KEY,
    inn VARCHAR(20) NOT NULL,
    address_key TEXT NOT NULL,
    parts JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (inn, address_key)
);