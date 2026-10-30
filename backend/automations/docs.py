import json

import requests

import payti

ACTIONS = {'docs-probe'}


def handle(event, action):
    params = event.get('queryStringParameters') or {}
    headers = {k.lower(): v for k, v in (event.get('headers') or {}).items()}
    conn = payti.db()
    cur = conn.cursor()
    cur.execute("SELECT id FROM api_keys WHERE api_key = %s AND is_active = true", (params.get('api_key') or headers.get('x-api-key') or '',))
    ok = cur.fetchone()
    cur.close()
    conn.close()
    if not ok:
        return payti.resp(401, {'error': 'Invalid API key'})
    deal_id = params.get('dealId') or ''
    bx = payti.Bitrix()
    out = {'dealId': deal_id}
    if params.get('mode') == 'inn':
        deal = bx.call('crm.deal.get', {'id': int(deal_id)}) or {}
        out['deal'] = {k: deal.get(k) for k in ('COMPANY_ID', 'CONTACT_ID', 'TITLE')}
        out['inn_like'] = {k: v for k, v in deal.items() if v and ('INN' in k.upper() or 'ИНН' in str(bx.fields('deal').get(k, {}).get('formLabel', '')).upper())}
        for et, key in ((4, 'COMPANY_ID'), (3, 'CONTACT_ID')):
            if deal.get(key) and deal.get(key) != '0':
                out[f'req_{et}'] = [{k: r.get(k) for k in ('ID', 'RQ_INN', 'RQ_KPP', 'RQ_COMPANY_NAME', 'RQ_OGRNIP', 'PRESET_ID')} for r in bx.call('crm.requisite.list', {'filter': {'ENTITY_TYPE_ID': et, 'ENTITY_ID': deal[key]}, 'select': ['*']}) or []]
        return payti.resp(200, out)
    try:
        res = bx.call('crm.documentgenerator.document.list', {
            'filter': {'entityTypeId': 2, 'entityId': int(deal_id)},
            'select': ['*'],
            'order': {'id': 'desc'},
        })
        docs = res.get('documents') if isinstance(res, dict) else res
        out['documents'] = []
        for d in docs or []:
            item = {k: v for k, v in d.items() if k not in ('downloadUrl', 'pdfUrl', 'imageUrl', 'downloadUrlMachine', 'pdfUrlMachine', 'imageUrlMachine')}
            checks = {}
            for key in ('downloadUrlMachine', 'pdfUrlMachine'):
                url = d.get(key)
                if not url:
                    checks[key] = 'нет ссылки'
                    continue
                try:
                    r = requests.get(url, timeout=6, stream=True)
                    checks[key] = {'status': r.status_code, 'type': r.headers.get('Content-Type'), 'disposition': r.headers.get('Content-Disposition'), 'size': r.headers.get('Content-Length')}
                    r.close()
                except Exception as e:
                    checks[key] = f'ошибка: {e}'
            item['checks'] = checks
            item['linkFields'] = [k for k in d if 'rl' in k]
            out['documents'].append(item)
    except Exception as e:
        out['error'] = str(e)
    return payti.resp(200, out)
