import json
import os
import re
import time

import psycopg2

from payti import Bitrix

CTX = {'calls': []}
SECRET = {'key', 'api_key', 'token'}

KINDS = {
    'slots-hook': 'Вебхук из CRM',
    'slots-public-slots': 'Клиент: запрос времени',
    'slots-public-book': 'Клиент: запись',
    'slots-invite': 'Админ: создание ссылки',
    'slots-resend': 'Админ: дослать задачу или событие',
    'slots-cancel': 'Админ: отмена записи',
    'slots-retry': 'Автоповтор: задача и событие',
}


def reset():
    CTX['calls'] = []


def cut(v, n=2000):
    try:
        s = v if isinstance(v, str) else json.dumps(v, ensure_ascii=False, default=str)
    except Exception:
        s = str(v)
    return s if len(s) <= n else s[:n] + '…'


def add_call(method, params, response, ok, ms):
    if len(CTX['calls']) < 60:
        CTX['calls'].append({'method': method, 'request': cut(params), 'response': cut(response, 1500), 'ok': ok, 'ms': ms})


class SlotBitrix(Bitrix):
    def call(self, method, params=None):
        t = time.time()
        try:
            r = super().call(method, params)
        except Exception as e:
            add_call(method, params or {}, str(e), False, int((time.time() - t) * 1000))
            raise
        add_call(method, params or {}, r, True, int((time.time() - t) * 1000))
        return r


def mask(params):
    return {k: ('***' if k.lower() in SECRET else v) for k, v in (params or {}).items()}


def finish(event, action, result, started):
    calls, CTX['calls'] = CTX['calls'], []
    try:
        params = event.get('queryStringParameters') or {}
        ip = ((event.get('requestContext') or {}).get('identity') or {}).get('sourceIp', '')
        body_raw = event.get('body') or ''
        status = result.get('statusCode') if isinstance(result, dict) else None
        try:
            data = json.loads(result.get('body') or '{}')
        except Exception:
            data = {}
        if action == 'slots-public-slots':
            summary = f"слотов: {len(data.get('slots') or [])}"
        elif data.get('error'):
            summary = str(data['error'])
        elif action == 'slots-hook':
            summary = data.get('link') or ('ссылка уже была' if data.get('reused') else 'ok')
        else:
            summary = 'ok' if data.get('ok', True) else 'ошибка'
        ok = bool(status and status < 400)
        req = {'params': mask(params)}
        if body_raw.strip():
            req['body'] = cut(body_raw, 1500)
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        deal = ''
        m = re.search(r'\d+', str(params.get('dealId') or params.get('deal_id') or data.get('dealId') or ''))
        if m:
            deal = m.group(0)
        if not deal and params.get('token'):
            cur.execute('SELECT deal_id FROM slot_bookings WHERE token = %s', (params['token'],))
            r = cur.fetchone()
            deal = str(r[0]) if r else ''
        cur.execute(
            """INSERT INTO slot_exchange (direction, kind, deal_id, ok, status, summary, request, response, source_ip, duration_ms)
            VALUES ('in', %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
            (action, deal, ok, status, cut(summary, 500), cut(req, 2500), cut(result.get('body') if isinstance(result, dict) else '', 1500),
             ip[:64], int((time.time() - started) * 1000)),
        )
        pid = cur.fetchone()[0]
        for c in calls:
            cur.execute(
                """INSERT INTO slot_exchange (parent_id, direction, kind, deal_id, ok, summary, request, response, duration_ms)
                VALUES (%s, 'out', %s, %s, %s, %s, %s, %s, %s)""",
                (pid, c['method'], deal, c['ok'], '' if c['ok'] else c['response'][:300], c['request'], c['response'], c['ms']),
            )
        cur.execute("DELETE FROM slot_exchange WHERE created_at < NOW() - INTERVAL '30 days'")
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f'[EXCHANGE] log failed: {e}')
