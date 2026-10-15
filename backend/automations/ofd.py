import base64
import hmac
import json
import os
import re

import requests
from psycopg2.extras import Json

import payti
from payti import hook_key_valid, cfg_entity, cfg_mode, Bitrix, CORS, collect, digits, entity_value, fix_case, links, multi_first, norm_phone, parse_deal_id, resp, db

OFD_URL = 'https://ofd.ru/api/integration/partner/v2/PartnerCreateClientCabinet'
FIELDS = [
    ('Inn', 'ИНН'),
    ('Kpp', 'КПП'),
    ('CompanyName', 'Название организации'),
    ('Email', 'Email клиента'),
    ('Name', 'Имя пользователя (необязательно)'),
    ('Phone', 'Телефон (необязательно)'),
]
ACTIONS = {'ofd-meta', 'ofd-settings', 'ofd-preview', 'ofd-register', 'ofd-history', 'ofd-hook'}


def get_settings(conn):
    cur = conn.cursor()
    cur.execute("SELECT * FROM ofd_settings WHERE connection_key = 'default'")
    row = cur.fetchone()
    if not row:
        cur.execute("INSERT INTO ofd_settings (connection_key) VALUES ('default') RETURNING *")
        row = cur.fetchone()
        conn.commit()
    cur.close()
    row['mapping_json'] = row.get('mapping_json') or {}
    return row


def auto_value(path, ctx):
    req, company, contact = ctx['requisite'], ctx['company'], ctx['contact']
    if path == 'Inn':
        return digits(req.get('RQ_INN')), 'Реквизиты'
    if path == 'Kpp':
        return digits(req.get('RQ_KPP')), 'Реквизиты'
    if path == 'CompanyName':
        v = req.get('RQ_COMPANY_FULL_NAME') or req.get('RQ_COMPANY_NAME') or company.get('TITLE') or ''
        return v, 'Реквизиты → название компании'
    if path == 'Email':
        v = multi_first(contact.get('EMAIL'), skip=lambda x: 'wappi' in x.lower())
        return v.strip().lower(), 'Email основного контакта'
    if path == 'Name':
        fio = f"{contact.get('LAST_NAME', '')} {contact.get('NAME', '')} {contact.get('SECOND_NAME', '')}".strip()
        return fix_case(fio), 'ФИО контакта'
    if path == 'Phone':
        for src, name in ((multi_first(contact.get('PHONE')), 'Контакт'), (req.get('RQ_PHONE'), 'Реквизиты'), (multi_first(company.get('PHONE')), 'Компания')):
            p = norm_phone(src)
            if p:
                return p, name
        return '', 'Не найден'
    return '', ''


def resolve(bx, ctx, settings, overrides):
    mapping = settings.get('mapping_json') or {}
    rows, values = [], {}
    for path, label in FIELDS:
        cfg = mapping.get(path) or {}
        mtype = cfg_mode(cfg)
        method = mtype
        if path in overrides and str(overrides[path]).strip():
            value, source, method = str(overrides[path]).strip(), 'Ввод вручную', 'MANUAL'
        elif mtype == 'STATIC':
            value, source = cfg.get('value', ''), 'Фиксированное значение'
        elif mtype == 'CRM':
            value = entity_value(bx, ctx, cfg_entity(cfg), cfg.get('field', ''))
            source = f"{payti.ENTITIES.get(cfg_entity(cfg), '')}: {cfg.get('field', '')}"
            if not str(value or '').strip():
                value, auto_src = auto_value(path, ctx)
                source += f' (пусто, взято по умолчанию: {auto_src})' if value else ' (пусто)'
        else:
            value, source = auto_value(path, ctx)
        if path in ('Inn', 'Kpp'):
            value = digits(value)
        elif path == 'Phone':
            value = norm_phone(value)
        elif path == 'Email':
            value = str(value or '').strip().lower()
        values[path] = value
        rows.append({'path': path, 'label': label, 'value': value, 'source': source, 'method': method})
    return rows, values


def validate(values):
    errors = []
    if len(values.get('Inn', '')) not in (10, 11, 12):
        errors.append('ИНН должен содержать от 10 до 12 цифр')
    if not values.get('CompanyName'):
        errors.append('Не заполнено: название организации')
    email = values.get('Email', '')
    if not email or not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email) or 'wappi' in email:
        errors.append('Email пустой, некорректный или служебный адрес мессенджера')
    if len(values.get('Name', '')) > 256:
        errors.append('Имя пользователя длиннее 256 символов')
    return errors


def build_payload(values):
    body = {k: values[k] for k in ('Inn', 'CompanyName', 'Email')}
    for k in ('Kpp', 'Name', 'Phone'):
        if values.get(k):
            body[k] = values[k]
    return body


def save_attempt(conn, ctx, status, values, source, payload, http_status=None, code=None, msg=None, body=None, agreement=None):
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO ofd_registrations
        (deal_id, company_id, contact_id, requisite_id, status, inn, email, agreement_id, http_status,
         error_code, error_message, request_payload, response_payload, source)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
        (ctx['deal_id'], str(ctx.get('company_id') or ''), str(ctx.get('contact_id') or ''), str(ctx.get('requisite_id') or ''),
         status, values.get('Inn'), values.get('Email'), agreement, http_status, code, msg,
         Json(payload), Json(body) if body is not None else None, source),
    )
    conn.commit()
    cur.close()


def prepare(conn, bx, deal_id, overrides, steps):
    settings = get_settings(conn)
    ctx = collect(bx, deal_id, steps)
    rows, values = resolve(bx, ctx, settings, overrides)
    errors = validate(values)
    steps.append({'step': 'Проверка', 'ok': not errors, 'info': '; '.join(errors) or 'Всё заполнено'})
    return settings, ctx, rows, values, errors


def error_text(body, http_status):
    if isinstance(body, dict):
        err = body.get('Error') or body.get('error') or body
        if isinstance(err, dict):
            code = err.get('Code') or err.get('code') or ''
            msg = err.get('Message') or err.get('message') or ''
            return code, f'{code} {msg}'.strip()
        return '', str(err)[:300]
    return '', f'ОФД вернул {http_status}'


def do_register(conn, bx, deal_id, overrides, force, source):
    steps = []
    result = {'ok': False, 'dealId': deal_id, 'steps': steps}
    cur = conn.cursor()
    cur.execute("SELECT agreement_id, email FROM ofd_registrations WHERE deal_id = %s AND status = 'success' ORDER BY id DESC LIMIT 1", (str(deal_id),))
    prev = cur.fetchone()
    cur.close()
    if prev and not force:
        result.update(status='already_registered', agreementId=prev['agreement_id'], email=prev['email'],
                      error='По этой сделке кабинет в ОФД уже создан')
        return result

    settings, ctx, rows, values, errors = prepare(conn, bx, deal_id, overrides, steps)
    payload = build_payload(values)
    result['email'] = values.get('Email')

    if errors:
        payti.comment(bx, deal_id, 'ОФД.ру\nКабинет не создан, не заполнены данные:\n- ' + '\n- '.join(errors), steps)
        save_attempt(conn, ctx, 'validation_failed', values, source, payload, code='validation_failed', msg='; '.join(errors))
        result.update(status='validation_failed', error='; '.join(errors))
        return result

    token = os.environ.get('OFD_API_KEY', '')
    if not token:
        result.update(status='error', error='Не задан секрет OFD_API_KEY')
        return result

    http_status, body, status, err, code, agreement = None, None, 'temporary_error', None, None, None
    try:
        r = requests.post(OFD_URL, params={'AuthToken': token}, json=payload, timeout=10)
        http_status = r.status_code
        try:
            body = r.json()
        except Exception:
            body = {'raw': r.text[:1000]}
        if r.status_code == 200 and isinstance(body, dict) and body.get('Success'):
            status = 'success'
            agreement = (body.get('Data') or {}).get('OfdAgreementId')
        else:
            code, err = error_text(body, r.status_code)
            if 'AlreadyExists' in str(code) or 'AlreadyExists' in str(err):
                status = 'already_exists'
            elif r.status_code == 400:
                status = 'ofd_validation_error'
    except Exception as e:
        err = f'Сеть или таймаут: {e}'
    steps.append({'step': 'Запрос в ОФД', 'ok': status == 'success', 'info': f'{status} ({http_status})'})
    save_attempt(conn, ctx, status, values, source, payload, http_status, code, err, body, agreement)

    if status == 'success':
        if settings.get('result_agreement_field') and agreement:
            try:
                bx.call('crm.deal.update', {'id': deal_id, 'fields': {settings['result_agreement_field']: agreement}})
            except Exception as e:
                steps.append({'step': 'Запись в сделку', 'ok': False, 'info': str(e)})
        payti.comment(bx, deal_id, f"ОФД.ру\nЛичный кабинет создан\nEmail: {values['Email']}\nИНН: {values['Inn']}\nOfdAgreementId: {agreement}\nКлиенту отправлено письмо со ссылкой для создания логина и пароля.", steps)
        result.update(ok=True, status='success', agreementId=agreement, response=body)
    else:
        warn = '\nВнимание: кабинет мог частично создаться, проверьте перед повтором.' if (http_status or 0) >= 500 else ''
        payti.comment(bx, deal_id, f'ОФД.ру\nКабинет не создан: {status}. {err or ""}{warn}', steps)
        result.update(status=status, error=err, response=body)
    return result


def handle(event, action):
    params = event.get('queryStringParameters') or {}
    headers = {str(k).lower(): v for k, v in (event.get('headers') or {}).items()}
    body_raw = event.get('body') or ''
    if event.get('isBase64Encoded') and body_raw:
        body_raw = base64.b64decode(body_raw).decode('utf-8', 'ignore')

    conn = db()
    try:
        if action == 'ofd-hook':
            given = params.get('key') or headers.get('x-hook-key') or headers.get('x-api-key') or ''
            if not hook_key_valid(conn, given):
                return resp(401, {'ok': False, 'error': 'Неверный ключ'})
            deal_id = parse_deal_id(params, body_raw, headers)
            if not deal_id:
                return resp(400, {'ok': False, 'error': 'Не указан номер сделки'})
            result = do_register(conn, Bitrix(), deal_id, {}, False, 'hook')
            return resp(200, {'ok': result.get('ok', False), 'status': result.get('status'), 'dealId': deal_id,
                              'email': result.get('email'), 'agreementId': result.get('agreementId'), 'error': result.get('error')})

        cur = conn.cursor()
        cur.execute("SELECT id FROM api_keys WHERE api_key = %s AND is_active = true", (headers.get('x-api-key') or '',))
        if not cur.fetchone():
            return resp(401, {'error': 'Invalid API key'})
        cur.close()

        body = json.loads(body_raw) if body_raw.strip().startswith('{') else {}

        if action == 'ofd-meta':
            return resp(200, {
                'fields': [{'path': p, 'label': l} for p, l in FIELDS],
                'entities': payti.ENTITIES,
                'ofdKeyConfigured': bool(os.environ.get('OFD_API_KEY')),
                'bitrixConfigured': bool(os.environ.get('BITRIX_WEBHOOK_URL')),
            })

        if action == 'ofd-settings':
            if event.get('httpMethod') == 'POST':
                sets, vals = [], []
                if 'mapping_json' in body:
                    sets.append('mapping_json = %s')
                    vals.append(Json(body['mapping_json']))
                if 'result_agreement_field' in body:
                    sets.append('result_agreement_field = %s')
                    vals.append(body['result_agreement_field'])
                if sets:
                    cur = conn.cursor()
                    cur.execute(f"UPDATE ofd_settings SET {', '.join(sets)}, updated_at = NOW() WHERE connection_key = 'default'", vals)
                    conn.commit()
                    cur.close()
            return resp(200, {'settings': get_settings(conn)})

        if action == 'ofd-history':
            cur = conn.cursor()
            cur.execute("SELECT id, deal_id, status, inn, email, agreement_id, error_message, source, created_at FROM ofd_registrations ORDER BY created_at DESC LIMIT 20")
            return resp(200, {'history': cur.fetchall()})

        bx = Bitrix()
        if not bx.url.startswith('http'):
            return resp(400, {'error': 'Не задан BITRIX_WEBHOOK_URL'})
        deal_id = digits(body.get('dealId') or params.get('dealId'))
        if not deal_id:
            return resp(400, {'error': 'Не указан ID сделки'})
        overrides = body.get('overrides') or {}

        if action == 'ofd-preview':
            steps = []
            try:
                settings, ctx, rows, values, errors = prepare(conn, bx, deal_id, overrides, steps)
            except Exception as e:
                steps.append({'step': 'Ошибка', 'ok': False, 'info': str(e)})
                return resp(200, {'ok': False, 'error': str(e), 'steps': steps})
            return resp(200, {'ok': not errors, 'dealId': deal_id, 'fields': rows, 'errors': errors, 'steps': steps,
                              'links': links(bx, ctx), 'request': build_payload(values)})

        if action == 'ofd-register':
            try:
                result = do_register(conn, bx, deal_id, overrides, bool(body.get('force')), 'console')
            except Exception as e:
                return resp(200, {'ok': False, 'status': 'error', 'error': str(e)})
            return resp(200, result)

        return resp(400, {'error': 'Unknown action'})
    finally:
        conn.close()
