import base64
from datetime import datetime, timedelta

import requests

DEFAULT_URL = 'https://lk.edo.ru/api/edo/v1'
TOKEN_HOURS = 20


def base(s):
    return (s.get('potok_base_url') or DEFAULT_URL).rstrip('/')


def _check(r):
    try:
        data = r.json()
    except Exception:
        raise RuntimeError(f'ЭДО Поток ответил {r.status_code}: {r.text[:150]}')
    st = data.get('status') or {}
    if r.status_code >= 400 or st.get('code') not in (0, None):
        raise RuntimeError(f"ЭДО Поток: {st.get('message') or r.status_code}")
    return data


def login(conn, s):
    if not (s.get('potok_login') and s.get('potok_password')):
        raise RuntimeError('Заполните логин и пароль ЭДО Потока')
    r = requests.post(base(s) + '/clients/auth-global', json={'clientId': s['potok_login'].strip(), 'password': s['potok_password']}, timeout=10)
    data = _check(r)
    items = data.get('result') or []
    if not items:
        raise RuntimeError('ЭДО Поток не вернул доступных организаций')
    want = (s.get('potok_org_id') or '').strip().upper()
    pick = None
    for it in items:
        org = it.get('organization') or {}
        if want and want in (str(org.get('edoId') or '').upper(), str(org.get('inn') or '')):
            pick = it
            break
    pick = pick or items[0]
    cur = conn.cursor()
    cur.execute('UPDATE edo_settings SET potok_token = %s, potok_token_at = NOW() WHERE id = 1', (pick['token'],))
    conn.commit()
    cur.close()
    s['potok_token'] = pick['token']
    s['potok_token_at'] = datetime.utcnow()
    return pick


def orgs(s):
    if not (s.get('potok_login') and s.get('potok_password')):
        return []
    r = requests.post(base(s) + '/clients/auth-global', json={'clientId': s['potok_login'].strip(), 'password': s['potok_password']}, timeout=10)
    out = []
    for it in _check(r).get('result') or []:
        o = it.get('organization') or {}
        out.append({'id': o.get('edoId') or o.get('clientId'), 'name': o.get('fullName') or o.get('shortName') or '', 'inn': o.get('inn') or ''})
    return out


def token(conn, s):
    at = s.get('potok_token_at')
    if s.get('potok_token') and at and datetime.utcnow() - at < timedelta(hours=TOKEN_HOURS):
        return s['potok_token']
    return login(conn, s)['token']


def call(conn, s, method, path, **kw):
    for attempt in (0, 1):
        r = requests.request(method, base(s) + path, headers={'Authorization': f'Token {token(conn, s)}'}, timeout=12, **kw)
        if r.status_code == 401 and attempt == 0:
            s['potok_token'] = None
            login(conn, s)
            continue
        return _check(r)


def doc_types(conn, s):
    return call(conn, s, 'GET', '/dictionary/get-document-type').get('result') or []


def find_contractor(conn, s, inn):
    data = call(conn, s, 'GET', '/contractors/search-contractors', params={'query': inn})
    rows = ((data.get('result') or {}).get('data')) or []
    for row in rows:
        c = row.get('contractor') if isinstance(row.get('contractor'), dict) else row
        if str(c.get('inn') or '') == str(inn) and c.get('clientId'):
            return c['clientId'], c.get('fullName') or ''
    for row in rows:
        c = row.get('contractor') if isinstance(row.get('contractor'), dict) else row
        if c.get('clientId'):
            return c['clientId'], c.get('fullName') or ''
    return None, ''


def upload_draft(conn, s, to, doc_type, file_name, content, sign_requested):
    data = call(conn, s, 'POST', '/drafts/add', json={
        'content': base64.b64encode(content).decode('ascii'),
        'docType': int(doc_type), 'fileName': file_name, 'signRequested': bool(sign_requested), 'to': to,
    })
    res = data.get('result') or {}
    if res.get('errorCode'):
        raise RuntimeError(f"ЭДО Поток: {res['errorCode']}")
    d = res.get('data') or {}
    return str(d.get('draftId') or ''), d.get('statusName') or ''
