ALTER TABLE t_p25765938_ekomkassa_api_integr.payti_mapping_settings
  ADD COLUMN IF NOT EXISTS mode_r_entity VARCHAR(30),
  ADD COLUMN IF NOT EXISTS mode_r_field VARCHAR(100),
  ADD COLUMN IF NOT EXISTS mode_r_value VARCHAR(255);