import base64
import hmac
import json
import os
import re
import time
from datetime import datetime, timedelta

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
ACTIONS = {'ofd-meta', 'ofd-settings', 'ofd-preview', 'ofd-register', 'ofd-history', 'ofd-hook', 'ofd-retry'}
REQUESTS_PER_SERIES = 3
MAX_SERIES = 2
RETRY_MINUTES = 15
SERIES_BUDGET = 3.8


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
        return payti.auto_value('user.cashier', ctx)
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


def save_attempt(conn, ctx, status, values, source, payload, http_status=None, code=None, msg=None, body=None, agreement=None, attempt=1, retry=False):
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO ofd_registrations
        (deal_id, company_id, contact_id, requisite_id, status, inn, email, agreement_id, http_status,
         error_code, error_message, request_payload, response_payload, source, attempt, next_retry_at, retry_done)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
        (ctx['deal_id'], str(ctx.get('company_id') or ''), str(ctx.get('contact_id') or ''), str(ctx.get('requisite_id') or ''),
         status, values.get('Inn'), values.get('Email'), agreement, http_status, code, msg,
         Json(payload), Json(body) if body is not None else None, source, attempt,
         datetime.utcnow() + timedelta(minutes=RETRY_MINUTES) if retry else None, not retry),
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
        errs = body.get('Errors') or body.get('errors')
        err = (errs[0] if isinstance(errs, list) and errs else None) or body.get('Error') or body.get('error') or body
        if isinstance(err, dict):
            code = err.get('Code') or err.get('code') or ''
            msg = err.get('Message') or err.get('message') or ''
            if code or msg:
                return code, f'{code} {msg}'.strip()
        elif err is not body:
            return '', str(err)[:300]
    return '', f'ОФД вернул {http_status}'


def msk_now():
    return (datetime.utcnow() + timedelta(hours=3)).strftime('%d.%m.%Y %H:%M:%S')


STATUS_TEXT = {
    'success': 'кабинет создан',
    'already_exists': 'кабинет уже существует в ОФД',
    'ofd_validation_error': 'ОФД отклонил данные',
    'temporary_error': 'временная ошибка ОФД',
    'validation_failed': 'не заполнены данные',
    'already_registered': 'кабинет по сделке уже создан ранее',
    'error': 'ошибка',
}


def crm_log(bx, deal_id, steps, series, status, source, values=None, tries=None, agreement=None, next_retry=False, err=None, extra=''):
    lines = ['ОФД.ру', f'Серия запросов {series} из {MAX_SERIES}' if (status == 'temporary_error' or series > 1) else 'Запрос на создание кабинета',
             f'Итог: {STATUS_TEXT.get(status, status)}', f'Время (МСК): {msk_now()}', f'Источник: {source}']
    if values:
        if values.get('Inn'):
            lines.append(f"ИНН: {values['Inn']}")
        if values.get('Email'):
            lines.append(f"Email: {values['Email']}")
    for t in tries or []:
        part = f"Запрос {t['n']}: HTTP {t['http']}" if t.get('http') else f"Запрос {t['n']}: без ответа"
        if t.get('code'):
            part += f", код {t['code']}"
        if t.get('err'):
            part += f", {t['err']}"
        lines.append(part)
    if err and not tries:
        lines.append(f'Сообщение: {err}')
    if agreement:
        lines.append(f'OfdAgreementId: {agreement}')
    if status == 'success':
        lines.append('Клиенту отправлено письмо со ссылкой для создания логина и пароля.')
    if next_retry:
        lines.append(f'Следующая серия запросов примерно через {RETRY_MINUTES} мин.')
    elif status == 'temporary_error':
        lines.append('Попытки исчерпаны. Кабинет мог частично создаться: проверьте в ОФД перед ручным повтором.')
    if extra:
        lines.append(extra)
    payti.comment(bx, deal_id, '\n'.join(lines), steps)


def send_series(payload, token):
    tries, body, agreement = [], None, None
    status = 'temporary_error'
    deadline = time.time() + SERIES_BUDGET
    for n in range(1, REQUESTS_PER_SERIES + 1):
        left = deadline - time.time()
        if n > 1 and left < 0.8:
            break
        t = {'n': n, 'http': None, 'code': '', 'err': ''}
        status = 'temporary_error'
        try:
            r = requests.post(OFD_URL, params={'AuthToken': token}, json=payload, timeout=max(0.8, min(3.0, left)))
            t['http'] = r.status_code
            try:
                body = r.json()
            except Exception:
                body = {'raw': r.text[:1000]}
            if r.status_code == 200 and isinstance(body, dict) and body.get('Success'):
                status = 'success'
                agreement = (body.get('Data') or {}).get('OfdAgreementId')
            else:
                t['code'], t['err'] = error_text(body, r.status_code)
                if 'AlreadyExists' in str(t['code']) or 'AlreadyExists' in str(t['err']):
                    status = 'already_exists'
                elif r.status_code == 400:
                    status = 'ofd_validation_error'
        except Exception as e:
            t['err'] = f'Сеть или таймаут: {e}'
        t['status'] = status
        tries.append(t)
        if status != 'temporary_error':
            break
    return status, tries, body, agreement


def do_register(conn, bx, deal_id, overrides, force, source, series=1, saved_payload=None):
    steps = []
    result = {'ok': False, 'dealId': deal_id, 'steps': steps, 'attempt': series}
    cur = conn.cursor()
    cur.execute("SELECT agreement_id, email FROM ofd_registrations WHERE deal_id = %s AND status = 'success' ORDER BY id DESC LIMIT 1", (str(deal_id),))
    prev = cur.fetchone()
    cur.close()
    if prev and not force:
        crm_log(bx, deal_id, steps, series, 'already_registered', source, {'Email': prev['email']}, agreement=prev['agreement_id'])
        result.update(status='already_registered', agreementId=prev['agreement_id'], email=prev['email'],
                      error='По этой сделке кабинет в ОФД уже создан')
        return result

    if saved_payload:
        payload = saved_payload
        ctx = {'deal_id': str(deal_id)}
        values = {'Inn': payload.get('Inn'), 'Email': payload.get('Email')}
        errors = []
    else:
        settings, ctx, rows, values, errors = prepare(conn, bx, deal_id, overrides, steps)
        payload = build_payload(values)
    result['email'] = values.get('Email')

    if errors:
        crm_log(bx, deal_id, steps, series, 'validation_failed', source, values, err='; '.join(errors))
        save_attempt(conn, ctx, 'validation_failed', values, source, payload, code='validation_failed', msg='; '.join(errors), attempt=series)
        result.update(status='validation_failed', error='; '.join(errors))
        return result

    token = os.environ.get('OFD_API_KEY', '')
    if not token:
        crm_log(bx, deal_id, steps, series, 'error', source, values, err='Не задан секрет OFD_API_KEY')
        result.update(status='error', error='Не задан секрет OFD_API_KEY')
        return result

    status, tries, body, agreement = send_series(payload, token)
    last = tries[-1]
    err, code, http_status = last['err'] or None, last['code'] or None, last['http']
    will_retry = status == 'temporary_error' and series < MAX_SERIES
    steps.append({'step': 'Запрос в ОФД', 'ok': status == 'success', 'info': f'{status}, запросов в серии: {len(tries)}, серия {series}'})
    save_attempt(conn, ctx, status, values, source, payload, http_status, code, err, body, agreement, attempt=series, retry=will_retry)

    if status == 'success':
        settings = get_settings(conn)
        if settings.get('result_agreement_field') and agreement:
            try:
                bx.call('crm.deal.update', {'id': deal_id, 'fields': {settings['result_agreement_field']: agreement}})
            except Exception as e:
                steps.append({'step': 'Запись в сделку', 'ok': False, 'info': str(e)})
        result.update(ok=True, status='success', agreementId=agreement, response=body)
    else:
        result.update(status=status, error=err, response=body)
    crm_log(bx, deal_id, steps, series, status, source, values, tries, agreement, next_retry=will_retry)
    result['willRetry'] = will_retry
    result['requests'] = len(tries)
    return result


def run_retries(conn, bx, limit=1):
    cur = conn.cursor()
    cur.execute(
        """UPDATE ofd_registrations SET retry_done = TRUE WHERE id IN (
        SELECT id FROM ofd_registrations WHERE retry_done = FALSE AND next_retry_at IS NOT NULL AND next_retry_at <= NOW()
        ORDER BY next_retry_at LIMIT %s FOR UPDATE SKIP LOCKED) RETURNING id, deal_id, attempt, request_payload""", (limit,))
    rows = cur.fetchall()
    conn.commit()
    cur.close()
    out = []
    for row in rows:
        res = do_register(conn, bx, row['deal_id'], {}, False, 'retry', series=int(row['attempt'] or 1) + 1, saved_payload=row['request_payload'])
        out.append({'dealId': row['deal_id'], 'attempt': res.get('attempt'), 'status': res.get('status'), 'willRetry': res.get('willRetry', False)})
    return out


def handle(event, action):
    params = event.get('queryStringParameters') or {}
    headers = {str(k).lower(): v for k, v in (event.get('headers') or {}).items()}
    body_raw = event.get('body') or ''
    if event.get('isBase64Encoded') and body_raw:
        body_raw = base64.b64decode(body_raw).decode('utf-8', 'ignore')

    conn = db()
    try:
        if action == 'ofd-retry':
            given = params.get('key') or headers.get('x-hook-key') or headers.get('x-api-key') or ''
            if not hook_key_valid(conn, given):
                return resp(401, {'ok': False, 'error': 'Неверный ключ'})
            bx = Bitrix()
            if not bx.url.startswith('http'):
                return resp(400, {'ok': False, 'error': 'Не задан BITRIX_WEBHOOK_URL'})
            done = run_retries(conn, bx)
            return resp(200, {'ok': True, 'retried': done})

        if action == 'ofd-hook':
            given = params.get('key') or headers.get('x-hook-key') or headers.get('x-api-key') or ''
            if not hook_key_valid(conn, given):
                return resp(401, {'ok': False, 'error': 'Неверный ключ'})
            deal_id = parse_deal_id(params, body_raw, headers)
            if not deal_id:
                return resp(400, {'ok': False, 'error': 'Не указан номер сделки'})
            result = do_register(conn, Bitrix(), deal_id, {}, False, 'hook')
            return resp(200, {'ok': result.get('ok', False), 'status': result.get('status'), 'dealId': deal_id,
                              'email': result.get('email'), 'agreementId': result.get('agreementId'), 'error': result.get('error'),
                              'attempt': result.get('attempt'), 'willRetry': result.get('willRetry', False)})

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
