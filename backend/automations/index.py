import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

SCHEMA = 't_p25765938_ekomkassa_api_integr'
KINDS = ('lk', 'ofd')

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key',
    'Access-Control-Max-Age': '86400'
}


def resp(code: int, data: Any) -> Dict[str, Any]:
    return {
        'statusCode': code,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'body': json.dumps(data, default=str, ensure_ascii=False),
        'isBase64Encoded': False
    }


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'], cursor_factory=RealDictCursor)


def esc(value: str) -> str:
    return str(value).replace("'", "''")


def process_job(cur, job_id: int) -> None:
    """Обработка заявки: сбор данных из CRM и создание кабинета.
    Интеграция с CRM и API Екомкассы/ОФД будет подключена после получения документации."""
    cur.execute(
        f"UPDATE {SCHEMA}.automation_jobs SET status = 'error', attempts = attempts + 1, "
        f"last_error = 'Интеграция с CRM и API ещё не подключена', updated_at = NOW() WHERE id = {int(job_id)}"
    )


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Автоматизации: приём хуков из CRM, список заявок на создание кабинетов, повтор при ошибке"""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': '', 'isBase64Encoded': False}

    headers = event.get('headers') or {}
    api_key = headers.get('x-api-key') or headers.get('X-Api-Key')
    if not api_key:
        return resp(401, {'error': 'API key required'})

    conn = get_conn()
    conn.autocommit = True
    cur = conn.cursor()
    try:
        cur.execute(f"SELECT id FROM {SCHEMA}.api_keys WHERE api_key = '{esc(api_key)}' AND is_active = true")
        if not cur.fetchone():
            return resp(401, {'error': 'Invalid API key'})

        if method == 'GET':
            params = event.get('queryStringParameters') or {}
            kind = params.get('kind')
            if kind not in KINDS:
                return resp(400, {'error': 'kind must be lk or ofd'})
            cur.execute(
                f"SELECT id, kind, deal_id, status, account_login, last_error, attempts, raw_payload, created_at, updated_at "
                f"FROM {SCHEMA}.automation_jobs WHERE kind = '{kind}' ORDER BY created_at DESC LIMIT 100"
            )
            return resp(200, {'jobs': cur.fetchall()})

        if method == 'POST':
            body = json.loads(event.get('body') or '{}')

            if body.get('action') == 'retry':
                job_id = int(body.get('id', 0))
                cur.execute(f"SELECT id FROM {SCHEMA}.automation_jobs WHERE id = {job_id}")
                if not cur.fetchone():
                    return resp(404, {'error': 'Job not found'})
                process_job(cur, job_id)
                return resp(200, {'success': True})

            kind = body.get('kind')
            deal_id = body.get('deal_id')
            if kind not in KINDS or not deal_id:
                return resp(400, {'error': 'kind (lk|ofd) and deal_id are required'})

            cur.execute(
                f"INSERT INTO {SCHEMA}.automation_jobs (kind, deal_id, status, raw_payload) "
                f"VALUES ('{kind}', '{esc(deal_id)}', 'received', '{esc(json.dumps(body, ensure_ascii=False))}') RETURNING id"
            )
            job_id = cur.fetchone()['id']
            process_job(cur, job_id)
            return resp(200, {'success': True, 'job_id': job_id})

        return resp(405, {'error': 'Method not allowed'})
    finally:
        cur.close()
        conn.close()
