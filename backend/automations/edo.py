import base64
import json
import os
import re
from urllib.parse import urlparse

import boto3
import requests

import payti
from payti import resp, db, Bitrix

ACTIONS = {'edo-hook', 'edo-meta', 'edo-settings', 'edo-templates-sync', 'edo-template-save', 'edo-requests', 'edo-run', 'edo-test'}
SECRETS = ('bitrix_webhook_url', 'diadoc_password', 'potok_password')
COLS = ['bitrix_webhook_url', 'edo_field', 'diadoc_value', 'potok_value', 'file_format', 'diadoc_env', 'diadoc_client_id',
        'diadoc_login', 'diadoc_password', 'diadoc_box_id', 'potok_env', 'potok_base_url', 'potok_login', 'potok_password', 'potok_org_id']
DIADOC_URLS = {'test': 'https://diadoc-api.kontur.ru', 'prod': 'https://diadoc-api.kontur.ru'}
PROVIDERS = {'diadoc': 'Диадок', 'potok': 'ЭДО Поток'}


def get_settings(conn):
    cur = conn.cursor()
    cur.execute('SELECT * FROM edo_settings WHERE id = 1')
    row = cur.fetchone()
    cur.close()
    return row


def public_settings(s):
    out = dict(s)
    for k in SECRETS:
        v = out.pop(k, None) or ''
        out[k.replace('bitrix_webhook_url', 'webhook') + '_set'] = bool(v)
    out['webhook_hint'] = ''
    url = s.get('bitrix_webhook_url') or ''
    if '/rest/' in url:
        out['webhook_hint'] = url[:url.find('/rest/')] + '/rest/…' + url.rstrip('/')[-4:]
    return out


def make_bx(s):
    bx = Bitrix()
    url = (s.get('bitrix_webhook_url') or '').strip()
    if url:
        bx.url = url.rstrip('/') + '/'
        p = urlparse(bx.url)
        bx.origin = f'{p.scheme}://{p.netloc}'
    return bx


def log(conn, req_id, step, ok=True, info='', doc_id=None):
    cur = conn.cursor()
    cur.execute('INSERT INTO edo_events (request_id, document_id, step, ok, info) VALUES (%s, %s, %s, %s, %s)', (req_id, doc_id, step, ok, (info or '')[:500]))
    conn.commit()
    cur.close()


def s3_put(key, data, ctype):
    s3 = boto3.client('s3', endpoint_url='https://bucket.poehali.dev', aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'], aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])
    s3.put_object(Bucket='files', Key=key, Body=data, ContentType=ctype)
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def pick_provider(bx, s, deal):
    code = s.get('edo_field')
    if not code:
        return '', 'Не выбрано поле «Оператор ЭДО» в настройках'
    raw = deal.get(code)
    if isinstance(raw, list):
        raw = raw[0] if raw else ''
    val = str(bx.enum_name('deal', code, raw) if raw not in (None, '') else '').strip().lower()
    if not val:
        return '', 'В сделке не заполнено поле оператора ЭДО'
    if (s.get('diadoc_value') or 'диадок').strip().lower() in val:
        return 'diadoc', ''
    if (s.get('potok_value') or 'поток').strip().lower() in val:
        return 'potok', ''
    return '', f'Оператор «{val}» не распознан'


def process(conn, deal_id, source):
    s = get_settings(conn)
    cur = conn.cursor()
    cur.execute("INSERT INTO edo_requests (deal_id, source, status) VALUES (%s, %s, 'processing') RETURNING id", (str(deal_id), source))
    req = cur.fetchone()['id']
    conn.commit()

    def finish(status, error='', provider='', title=''):
        cur.execute('UPDATE edo_requests SET status = %s, error = %s, provider = %s, deal_title = %s, updated_at = NOW() WHERE id = %s', (status, error[:500] or None, provider or None, title or None, req))
        conn.commit()
        return {'ok': status in ('ready', 'sent'), 'requestId': req, 'status': status, 'error': error}

    try:
        bx = make_bx(s)
        deal = bx.call('crm.deal.get', {'id': int(deal_id)}) or {}
        title = deal.get('TITLE') or ''
        log(conn, req, 'Сделка получена', True, title)
        provider, err = pick_provider(bx, s, deal)
        if err:
            log(conn, req, 'Оператор ЭДО', False, err)
            return finish('error', err, '', title)
        log(conn, req, 'Оператор ЭДО', True, PROVIDERS[provider])
        cur.execute('SELECT template_id FROM edo_templates WHERE enabled = true')
        wanted = {r['template_id'] for r in cur.fetchall()}
        if not wanted:
            log(conn, req, 'Шаблоны', False, 'Не выбраны шаблоны документов для ЭДО')
            return finish('error', 'Не выбраны шаблоны документов для ЭДО', provider, title)
        res = bx.call('crm.documentgenerator.document.list', {'filter': {'entityTypeId': 2, 'entityId': int(deal_id)}, 'select': ['*'], 'order': {'id': 'desc'}})
        docs = res.get('documents') if isinstance(res, dict) else res
        docs = [d for d in docs or [] if str(d.get('templateId')) in wanted]
        log(conn, req, 'Документы найдены', bool(docs), f'{len(docs)} шт.')
        if not docs:
            return finish('error', 'В сделке нет документов по выбранным шаблонам', provider, title)
        fmt = s.get('file_format') or 'pdf'
        bad = 0
        for d in docs:
            files = []
            if fmt in ('pdf', 'both'):
                files.append(('pdf', d.get('pdfUrlMachine'), 'application/pdf'))
            if fmt in ('docx', 'both'):
                files.append(('docx', d.get('downloadUrlMachine'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'))
            for ext, url, ctype in files:
                bid = f"{d['id']}:{ext}"
                cur.execute(
                    "INSERT INTO edo_documents (request_id, deal_id, bitrix_doc_id, provider, template_id, title, number) VALUES (%s, %s, %s, %s, %s, %s, %s) "
                    "ON CONFLICT (deal_id, bitrix_doc_id) DO UPDATE SET request_id = EXCLUDED.request_id, provider = EXCLUDED.provider, updated_at = NOW() RETURNING id, status",
                    (req, str(deal_id), bid, provider, str(d.get('templateId')), d.get('title'), d.get('number')),
                )
                row = cur.fetchone()
                conn.commit()
                if row['status'] in ('sent',):
                    log(conn, req, f"{d.get('title')} .{ext}", True, 'Уже отправлен, пропуск', row['id'])
                    continue
                try:
                    r = requests.get(url, timeout=15)
                    r.raise_for_status()
                    if len(r.content) < 100:
                        raise RuntimeError('Пустой файл')
                    name = f"{re.sub(r'[^A-Za-z0-9._-]+', '_', str(d.get('number') or d['id']))}_{d['id']}.{ext}"
                    cdn = s3_put(f'edo/{deal_id}/{name}', r.content, ctype)
                    cur.execute("UPDATE edo_documents SET status = 'ready', file_name = %s, file_url = %s, file_size = %s, error = NULL, updated_at = NOW() WHERE id = %s", (name, cdn, len(r.content), row['id']))
                    conn.commit()
                    log(conn, req, f"{d.get('title')} .{ext}", True, f'Скачан, {len(r.content) // 1024} КБ', row['id'])
                except Exception as e:
                    bad += 1
                    cur.execute("UPDATE edo_documents SET status = 'error', error = %s, updated_at = NOW() WHERE id = %s", (str(e)[:300], row['id']))
                    conn.commit()
                    log(conn, req, f"{d.get('title')} .{ext}", False, str(e), row['id'])
        log(conn, req, 'Отправка в ЭДО', False, f'Передача в {PROVIDERS[provider]} ещё не подключена: файлы подготовлены')
        return finish('error' if bad else 'ready', f'Не скачано файлов: {bad}' if bad else '', provider, title)
    except Exception as e:
        conn.rollback()
        log(conn, req, 'Ошибка', False, str(e))
        return finish('error', str(e), '', '')


def test_diadoc(s):
    if not (s.get('diadoc_client_id') and s.get('diadoc_login') and s.get('diadoc_password')):
        return {'ok': False, 'error': 'Заполните ключ интеграции, логин и пароль'}
    r = requests.post(
        DIADOC_URLS.get(s.get('diadoc_env')) + '/V3/Authenticate?type=password',
        headers={'Authorization': f"DiadocAuth ddauth_api_client_id={s['diadoc_client_id']}", 'Content-Type': 'application/json'},
        data=json.dumps({'login': s['diadoc_login'], 'password': s['diadoc_password']}), timeout=8,
    )
    if r.status_code != 200:
        return {'ok': False, 'error': f'Диадок ответил {r.status_code}: {r.text[:150]}'}
    token = r.text.strip().strip('"')
    try:
        tok = token if '=' not in token else token
        g = requests.get(DIADOC_URLS.get(s.get('diadoc_env')) + '/GetMyOrganizations', headers={
            'Authorization': f"DiadocAuth ddauth_api_client_id={s['diadoc_client_id']},ddauth_token={tok}", 'Accept': 'application/json'}, timeout=8)
        orgs = g.json().get('Organizations', []) if g.status_code == 200 else []
    except Exception:
        orgs = []
    return {'ok': True, 'info': 'Вход выполнен', 'boxes': [{'id': (o.get('Boxes') or [{}])[0].get('BoxIdGuid') or o.get('OrgId'), 'name': o.get('ShortName') or o.get('FullName'), 'inn': o.get('Inn')} for o in orgs]}


def test_potok(s):
    if not (s.get('potok_base_url') and s.get('potok_login') and s.get('potok_password')):
        return {'ok': False, 'error': 'Заполните адрес API, логин и пароль'}
    try:
        r = requests.get(s['potok_base_url'].rstrip('/'), timeout=6)
    except Exception as e:
        return {'ok': False, 'error': f'Адрес не отвечает: {e}'}
    return {'ok': True, 'info': f'Адрес отвечает (код {r.status_code}). Проверка входа появится после подключения протокола Потока'}


def handle(event, action):
    params = event.get('queryStringParameters') or {}
    headers = {k.lower(): v for k, v in (event.get('headers') or {}).items()}
    body_raw = event.get('body') or ''
    if event.get('isBase64Encoded') and body_raw:
        body_raw = base64.b64decode(body_raw).decode('utf-8', 'ignore')
    conn = db()
    try:
        key = params.get('key') or params.get('api_key') or headers.get('x-hook-key') or headers.get('x-api-key') or ''
        if not payti.hook_key_valid(conn, key):
            return resp(401, {'ok': False, 'error': 'Неверный ключ'})
        body = json.loads(body_raw) if body_raw.strip().startswith('{') else {}
        cur = conn.cursor()

        if action in ('edo-hook', 'edo-run'):
            deal_id = payti.parse_deal_id(params, body_raw, headers)
            if not deal_id:
                return resp(400, {'ok': False, 'error': 'Не указан номер сделки'})
            r = process(conn, deal_id, 'hook' if action == 'edo-hook' else 'manual')
            return resp(200, {**r, 'dealId': deal_id})

        if action == 'edo-meta':
            s = get_settings(conn)
            fields, err = [], ''
            try:
                for code, f in (make_bx(s).fields('deal') or {}).items():
                    if code.startswith('UF_') and f.get('type') in ('enumeration', 'string'):
                        fields.append({'code': code, 'label': f.get('formLabel') or f.get('listLabel') or code, 'items': [i.get('VALUE') for i in f.get('items') or []]})
            except Exception as e:
                err = str(e)
            cur.execute('SELECT template_id, name, enabled FROM edo_templates ORDER BY name')
            return resp(200, {'settings': public_settings(s), 'fields': fields, 'templates': cur.fetchall(), 'error': err})

        if action == 'edo-settings':
            sets, vals = [], []
            for c in COLS:
                if c in body:
                    v = body[c]
                    if c in SECRETS and not v:
                        continue
                    sets.append(f'{c} = %s')
                    vals.append(v if v != '' else None)
            if sets:
                cur.execute(f"UPDATE edo_settings SET {', '.join(sets)}, updated_at = NOW() WHERE id = 1", vals)
                conn.commit()
            return resp(200, {'ok': True, 'settings': public_settings(get_settings(conn))})

        if action == 'edo-templates-sync':
            s = get_settings(conn)
            try:
                res = make_bx(s).call('crm.documentgenerator.template.list', {'select': ['id', 'name', 'active'], 'filter': {'active': 'Y'}})
            except Exception as e:
                return resp(200, {'ok': False, 'error': str(e)})
            items = res.get('templates') if isinstance(res, dict) else res
            if isinstance(items, dict):
                items = list(items.values())
            for t in items or []:
                if not isinstance(t, dict):
                    continue
                cur.execute("INSERT INTO edo_templates (template_id, name) VALUES (%s, %s) ON CONFLICT (template_id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()", (str(t['id']), t.get('name') or ''))
            conn.commit()
            cur.execute('SELECT template_id, name, enabled FROM edo_templates ORDER BY name')
            return resp(200, {'ok': True, 'templates': cur.fetchall()})

        if action == 'edo-template-save':
            cur.execute('UPDATE edo_templates SET enabled = %s, updated_at = NOW() WHERE template_id = %s', (bool(body.get('enabled')), str(body.get('template_id'))))
            conn.commit()
            return resp(200, {'ok': True})

        if action == 'edo-test':
            s = get_settings(conn)
            return resp(200, test_diadoc(s) if params.get('provider') == 'diadoc' else test_potok(s))

        if action == 'edo-requests':
            cur.execute('SELECT * FROM edo_requests ORDER BY id DESC LIMIT 100')
            rows = cur.fetchall()
            ids = [r['id'] for r in rows[:30]]
            docs, events = {}, {}
            if ids:
                cur.execute('SELECT id, request_id, title, number, file_name, file_url, file_size, status, error FROM edo_documents WHERE request_id = ANY(%s) ORDER BY id', (ids,))
                for d in cur.fetchall():
                    docs.setdefault(d['request_id'], []).append(d)
                cur.execute('SELECT request_id, step, ok, info, created_at FROM edo_events WHERE request_id = ANY(%s) ORDER BY id', (ids,))
                for e in cur.fetchall():
                    events.setdefault(e['request_id'], []).append(e)
            return resp(200, {'requests': rows, 'documents': docs, 'events': events})

        return resp(400, {'error': 'Unknown action'})
    finally:
        conn.close()
