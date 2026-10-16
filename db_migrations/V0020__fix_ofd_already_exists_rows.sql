UPDATE t_p25765938_ekomkassa_api_integr.ofd_registrations
SET status = 'already_exists',
    error_code = 'AlreadyExists',
    error_message = 'AlreadyExists Компания уже существует'
WHERE response_payload->'Errors'->0->>'Code' = 'AlreadyExists'
  AND status = 'ofd_validation_error';