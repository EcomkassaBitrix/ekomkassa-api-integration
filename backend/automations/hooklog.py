import json
import os
import re

import psycopg2

HOOK_ACTIONS = {'hook', 'ofd-hook', 'fns-hook'}
SECRET_PARAMS = {'key', 'api_key', 'token'}


def mask_params(params):
    out = {}
    for k, v in (params or {}).items():
        out[k] = '***' if k.lower() in SECRET_PARAMS else v
    return json.dumps(out, ensure_ascii=False)[:500]


def find_deal(params, body_raw):
    for k in ('dealId', 'deal_id', 'DEAL_ID', 'document_id', 'id', 'data[FIELDS][ID]'):
        if params.get(k):
            m = re.search(r'\d+', str(params[k]))
            if m:
                return m.group(0)
    m = re.search(r'(?:dealId|deal_id|DEAL_ID|document_id(?:\[2\])?|\bID)["=:\s]+"?(\d+)', body_raw or '')
    return m.group(1) if m else ''


def record(event, action, result):
    try:
        params = event.get('queryStringParameters') or {}
        headers = {str(k).lower(): v for k, v in (event.get('headers') or {}).items()}
        body_raw = event.get('body') or ''
        key_given = bool(params.get('key') or headers.get('x-hook-key') or headers.get('x-api-key'))
        status = result.get('statusCode') if isinstance(result, dict) else None
        text = ''
        if isinstance(result, dict):
            try:
                data = json.loads(result.get('body') or '{}')
                text = (data.get('error') or data.get('status') or ('ok' if data.get('ok') else ''))
            except Exception:
                text = ''
        ip = ((event.get('requestContext') or {}).get('identity') or {}).get('sourceIp', '')
        deal = find_deal(params, body_raw)
        print(f"[HOOK] action={action} deal={deal or '-'} method={event.get('httpMethod')} key_given={key_given} "
              f"status={status} result={str(text)[:120]} ip={ip} params={mask_params(params)}")
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO hook_log (action, deal_id, http_method, params_masked, key_given, result_status, result_text, source_ip, user_agent)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (action, deal, event.get('httpMethod'), mask_params(params), key_given, status, str(text)[:500], ip[:64],
             (headers.get('user-agent') or '')[:200]),
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f'[HOOK] log failed: {e}')
