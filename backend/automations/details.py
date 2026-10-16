from payti import db, digits, resp

ACTIONS = {'attempt-detail'}

QUERIES = {
    'payti': """SELECT id, deal_id, status, environment, registration_mode, login, tax_id, firm_id, store_id, http_status,
        error_code, error_message, request_payload_masked AS request, response_payload AS response, source, created_at
        FROM payti_registrations WHERE id = %s""",
    'ofd': """SELECT id, deal_id, status, inn, email, agreement_id, http_status, error_code, error_message,
        request_payload AS request, response_payload AS response, source, created_at
        FROM ofd_registrations WHERE id = %s""",
    'fns': """SELECT id, deal_id, status, inn, company_name, serial_number, fn_number, rnm, status_reason, error_message,
        request_payload AS request, response_payload AS response, ofd_application_id, signer_name, source, created_at
        FROM fns_applications WHERE id = %s""",
}


def handle(event, action):
    params = event.get('queryStringParameters') or {}
    headers = {str(k).lower(): v for k, v in (event.get('headers') or {}).items()}
    conn = db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM api_keys WHERE api_key = %s AND is_active = true", (headers.get('x-api-key') or '',))
        if not cur.fetchone():
            return resp(401, {'error': 'Invalid API key'})
        kind = params.get('kind', '')
        if kind not in QUERIES:
            return resp(400, {'error': 'Unknown kind'})
        cur.execute(QUERIES[kind], (digits(params.get('id')) or '0',))
        row = cur.fetchone()
        if not row:
            return resp(404, {'error': 'Запись не найдена'})
        events = []
        if kind == 'fns':
            cur.execute("SELECT step, ok, info, created_at FROM fns_events WHERE application_id = %s ORDER BY id", (row['id'],))
            events = cur.fetchall()
        return resp(200, {'kind': kind, 'item': row, 'events': events})
    finally:
        conn.close()
