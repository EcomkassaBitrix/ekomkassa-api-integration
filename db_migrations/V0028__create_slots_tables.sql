CREATE TABLE IF NOT EXISTS t_p25765938_ekomkassa_api_integr.slot_settings (
    id INT PRIMARY KEY DEFAULT 1,
    title VARCHAR(200) NOT NULL DEFAULT 'Запись на настройку',
    logo_url TEXT,
    base_url VARCHAR(300),
    timezone VARCHAR(60) NOT NULL DEFAULT 'Europe/Moscow',
    step_min INT NOT NULL DEFAULT 30,
    horizon_days INT NOT NULL DEFAULT 14,
    min_notice_hours INT NOT NULL DEFAULT 2,
    reschedule_deadline_hours INT NOT NULL DEFAULT 12,
    max_per_day INT NOT NULL DEFAULT 0,
    link_days INT NOT NULL DEFAULT 14,
    source_category_id VARCHAR(20),
    source_stage_id VARCHAR(50),
    classifier_field VARCHAR(100),
    link_field VARCHAR(100),
    start_field VARCHAR(100),
    target_stage_id VARCHAR(50),
    create_task BOOLEAN NOT NULL DEFAULT TRUE,
    task_title VARCHAR(300) NOT NULL DEFAULT 'Настройка по сделке №{deal}: {service}',
    create_calendar_event BOOLEAN NOT NULL DEFAULT TRUE,
    check_bitrix_busy BOOLEAN NOT NULL DEFAULT TRUE,
    department_id VARCHAR(20),
    employees JSONB NOT NULL DEFAULT '[]'::jsonb,
    assigner_mode VARCHAR(10) NOT NULL DEFAULT 'deal',
    assigner_user_id VARCHAR(20),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
INSERT INTO t_p25765938_ekomkassa_api_integr.slot_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS t_p25765938_ekomkassa_api_integr.slot_services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    match_values TEXT[] NOT NULL DEFAULT '{}',
    duration_min INT NOT NULL DEFAULT 60,
    buffer_min INT NOT NULL DEFAULT 0,
    work_days INT[] NOT NULL DEFAULT '{1,2,3,4,5}',
    work_from VARCHAR(5) NOT NULL DEFAULT '09:00',
    work_to VARCHAR(5) NOT NULL DEFAULT '18:00',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p25765938_ekomkassa_api_integr.slot_bookings (
    id SERIAL PRIMARY KEY,
    token VARCHAR(64) NOT NULL UNIQUE,
    deal_id VARCHAR(50) NOT NULL,
    deal_title VARCHAR(300),
    service_id INT,
    status VARCHAR(20) NOT NULL DEFAULT 'invited',
    employee_id VARCHAR(20),
    employee_name VARCHAR(200),
    start_at TIMESTAMP,
    end_at TIMESTAMP,
    task_id VARCHAR(50),
    event_id VARCHAR(50),
    reschedule_count INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_slot_bookings_deal ON t_p25765938_ekomkassa_api_integr.slot_bookings (deal_id);
CREATE INDEX IF NOT EXISTS idx_slot_bookings_start ON t_p25765938_ekomkassa_api_integr.slot_bookings (start_at) WHERE status = 'booked';

CREATE TABLE IF NOT EXISTS t_p25765938_ekomkassa_api_integr.slot_events (
    id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL,
    step VARCHAR(100) NOT NULL,
    ok BOOLEAN NOT NULL DEFAULT TRUE,
    info TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_slot_events_booking ON t_p25765938_ekomkassa_api_integr.slot_events (booking_id);