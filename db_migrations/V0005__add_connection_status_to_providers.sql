-- Add connection_status column to providers table
ALTER TABLE providers 
ADD COLUMN IF NOT EXISTS connection_status VARCHAR(50) DEFAULT 'not_configured';

-- Set configured status for providers that have non-empty config
UPDATE providers 
SET connection_status = 'configured' 
WHERE config IS NOT NULL AND config::text != '{}' AND config::text != 'null';