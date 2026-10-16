import base64
import json
import os
import re
import secrets
from datetime import datetime, timezone

import requests
from psycopg2.extras import Json

import payti
from payti import hook_key_valid, cfg_entity, cfg_mode, Bitrix, collect, digits, entity_value, links, parse_deal_id, resp, db

OFD_API = 'https://ofd.ru/api'
LINK_DAYS = 14
FIELDS = [
    ('Inn', 'ИНН'),
    ('Kpp', 'КПП'),
    ('CompanyName', 'Название организации'),
    ('SerialNumber', 'Заводской номер кассы'),
    ('FnNumber', 'Номер фискального накопителя'),
    ('Model', 'Модель кассы'),
    ('FullAddress', 'Адрес установки кассы'),
    ('InstallmentPlace', 'Место расчётов (адрес или сайт)'),
    ('FormatVersion', 'Версия ФФД (2, 3 или 4)'),
    ('Internet', 'Расчёты в интернете (да/нет)'),
    ('Agent', 'Платёжный агент (да/нет)'),
    ('Marking', 'Маркированные товары (да/нет)'),
    ('ExcisableGoods', 'Подакцизные товары (да/нет)'),
    ('RegNumber', 'Регистрационный номер кассы (РНМ)'),
    ('ReregReasons', 'Причины перерегистрации (через запятую)'),
    ('UnregReason', 'Причина снятия с учёта (утеряна, украдена, сломана)'),
    ('ClosedFdDateTime', 'Закрытие старого ФН: дата и время отчёта'),
    ('ClosedFdNumber', 'Закрытие старого ФН: номер фискального документа'),
    ('ClosedFpValue', 'Закрытие старого ФН: фискальный признак'),
    ('InstalledFdDateTime', 'Установка нового ФН: дата и время отчёта'),
    ('InstalledFdNumber', 'Установка нового ФН: номер фискального документа'),
    ('InstalledFpValue', 'Установка нового ФН: фискальный признак'),
    ('ReportDateTime', 'Отчёт о регистрации: дата и время'),
    ('ReportDocumentNumber', 'Отчёт о регистрации: номер фискального документа'),
    ('ReportFiscalSign', 'Отчёт о регистрации: фискальный признак'),
    ('OfdLogin', 'Логин кабинета ОФД клиента'),
    ('OfdPassword', 'Пароль кабинета ОФД клиента'),
]
LABELS = dict(FIELDS)
OPTIONS = {
    'FormatVersion': [
        {'value': '2', 'label': '2 — ФФД 1.05'},
        {'value': '3', 'label': '3 — ФФД 1.1'},
        {'value': '4', 'label': '4 — ФФД 1.2'},
    ],
}
SECRET_FIELDS = ('OfdLogin', 'OfdPassword')
BOOLS = ('Internet', 'Agent', 'Marking', 'ExcisableGoods')
REPORT_FIELDS = ('ReportDateTime', 'ReportDocumentNumber', 'ReportFiscalSign')
CLOSED_FIELDS = ('ClosedFdDateTime', 'ClosedFdNumber', 'ClosedFpValue', 'InstalledFdDateTime', 'InstalledFdNumber', 'InstalledFpValue')
DT_FIELDS = ('ClosedFdDateTime', 'InstalledFdDateTime', 'ReportDateTime')
NUM_FIELDS = ('Inn', 'Kpp', 'FnNumber', 'FormatVersion', 'RegNumber', 'ClosedFdNumber', 'ClosedFpValue', 'InstalledFdNumber', 'InstalledFpValue', 'ReportDocumentNumber', 'ReportFiscalSign')
PURPOSES = {'InitialRegistration': 'Регистрация кассы', 'Reregistration': 'Перерегистрация кассы', 'Unregistration': 'Снятие кассы с учёта', 'Report': 'Отчёт о регистрации'}
PURPOSE_LETTER = {'InitialRegistration': 'I', 'Reregistration': 'R', 'Unregistration': 'U', 'Report': 'P'}
ALIASES = {
    'initialregistration': 'InitialRegistration', 'initial': 'InitialRegistration', 'registration': 'InitialRegistration', 'register': 'InitialRegistration',
    'reg': 'InitialRegistration', 'регистрация': 'InitialRegistration',
    'report': 'Report', 'отчет': 'Report', 'отчёт': 'Report', 'finalization': 'Report',
    'reregistration': 'Reregistration', 'rereg': 'Reregistration', 'reregister': 'Reregistration', 'перерегистрация': 'Reregistration',
    'unregistration': 'Unregistration', 'unreg': 'Unregistration', 'unregister': 'Unregistration', 'снятие': 'Unregistration',
}
SCOPE = {
    'RegNumber': 'RU', 'ReregReasons': 'R', 'UnregReason': 'U',
    'ClosedFdDateTime': 'R', 'ClosedFdNumber': 'R', 'ClosedFpValue': 'R',
    'InstalledFdDateTime': 'R', 'InstalledFdNumber': 'R', 'InstalledFpValue': 'R',
    'ReportDateTime': 'P', 'ReportDocumentNumber': 'P', 'ReportFiscalSign': 'P',
}
REREG_FLAGS = ('AutomatedDeviceChanged', 'FnChanged', 'InstallmentPlaceChanged', 'OfdChaged', 'Other', 'SwitchedFromOfflineToOnlineMode', 'SwitchedFromOnlineToOfflineMode', 'UserChanged')
UNREG_FLAGS = ('Lost', 'Stolen', 'Broken')
ACTIONS = {
    'fns-meta', 'fns-settings', 'fns-preview', 'fns-create', 'fns-history', 'fns-events', 'fns-refresh', 'fns-hook',
    'fns-public-get', 'fns-public-prepare', 'fns-public-sign', 'fns-access-check',
}
PUBLIC = {'fns-public-get', 'fns-public-prepare', 'fns-public-sign'}
SIGNABLE = ('created', 'awaiting_signature', 'test_created', 'test_awaiting_signature')
STATUS_MAP = {
    'New': 'created',
    'AwaitingDocuments': 'awaiting_signature',
    'AwaitingSignature': 'awaiting_signature',
    'ProcessingSignedDocuments': 'sent_to_fns',
    'ReadyToBeSentToFns': 'sent_to_fns',
    'SentToFns': 'sent_to_fns',
    'DownloadingDocuments': 'sent_to_fns',
    'AwaitingAutoFinalization': 'sent_to_fns',
    'UnknownError': 'ofd_error',
    'Approved': 'approved',
    'Rejected': 'rejected',
}


class OfdError(Exception):
    def __init__(self, message, http_status=None, network=False, body=None):
        super().__init__(message)
        self.http_status = http_status
        self.network = network
        self.body = body


def scope_of(path):
    return SCOPE.get(path, 'IRU')


def purpose_from_param(v):
    key = str(v or '').strip().lower().replace(' ', '')
    return ALIASES.get(key) or (v if v in PURPOSES else None)


def norm_ffd(v):
    s = str(v or '').strip().lower().replace(',', '.')
    if s in ('2', '3', '4'):
        return s
    if '1.05' in s:
        return '2'
    if '1.2' in s:
        return '4'
    if '1.1' in s:
        return '3'
    return digits(s)


def parse_dt(v):
    s = str(v or '').strip().replace('Z', '+00:00')
    if not s:
        return ''
    for fmt in ('%d.%m.%Y %H:%M:%S', '%d.%m.%Y %H:%M', '%d.%m.%Y'):
        try:
            return datetime.strptime(s, fmt).strftime('%Y-%m-%dT%H:%M:%S')
        except ValueError:
            pass
    try:
        d = datetime.fromisoformat(s)
    except ValueError:
        return ''
    if d.tzinfo:
        d = d.astimezone(timezone.utc).replace(tzinfo=None)
    return d.strftime('%Y-%m-%dT%H:%M:%S')


def tokens(text):
    return [t.strip().lower() for t in re.split(r'[,;|\n]+', str(text or '')) if t.strip()]


def parse_rereg(text):
    flags, unknown = {k: False for k in REREG_FLAGS}, []
    for t in tokens(text):
        c = t.replace(' ', '')
        if c in {k.lower() for k in REREG_FLAGS}:
            flags[next(k for k in REREG_FLAGS if k.lower() == c)] = True
        elif 'ofdchanged' in c:
            flags['OfdChaged'] = True
        elif 'замен' in t and ('фн' in t or 'накоп' in t) or t in ('фн', 'замена фн'):
            flags['FnChanged'] = True
        elif 'адрес' in t or 'место' in t:
            flags['InstallmentPlaceChanged'] = True
        elif 'офд' in t or 'оператор' in t:
            flags['OfdChaged'] = True
        elif 'организац' in t or 'пользовател' in t or 'владел' in t:
            flags['UserChanged'] = True
        elif 'автоном' in t or 'оффлайн' in t or 'офлайн' in t:
            flags['SwitchedFromOnlineToOfflineMode'] = True
        elif 'онлайн' in t or 'интернет' in t or 'в сеть' in t:
            flags['SwitchedFromOfflineToOnlineMode'] = True
        elif 'автомат' in t:
            flags['AutomatedDeviceChanged'] = True
        elif 'друг' in t or 'иное' in t or t == 'other':
            flags['Other'] = True
        else:
            unknown.append(t)
    return flags, unknown


def parse_unreg(text):
    flags, unknown = {k: False for k in UNREG_FLAGS}, []
    for t in tokens(text):
        if t in ('lost',) or 'потер' in t or 'утер' in t or 'утра' in t:
            flags['Lost'] = True
        elif t == 'stolen' or 'хищ' in t or 'украд' in t or 'кража' in t:
            flags['Stolen'] = True
        elif t == 'broken' or 'слом' in t or 'неисправ' in t or 'поврежд' in t:
            flags['Broken'] = True
        else:
            unknown.append(t)
    return flags, unknown


def truthy(v):
    return str(v or '').strip().lower() in ('да', 'true', '1', 'y', 'yes', '+')


def get_settings(conn):
    cur = conn.cursor()
    cur.execute("SELECT * FROM fns_settings WHERE connection_key = 'default'")
    row = cur.fetchone()
    if not row:
        cur.execute("INSERT INTO fns_settings (connection_key) VALUES ('default') RETURNING *")
        row = cur.fetchone()
        conn.commit()
    cur.close()
    row['mapping_json'] = row.get('mapping_json') or {}
    return row


def auto_value(path, ctx):
    req, company = ctx['requisite'], ctx['company']
    if path == 'Inn':
        return digits(req.get('RQ_INN')), 'Реквизиты'
    if path == 'Kpp':
        return digits(req.get('RQ_KPP')), 'Реквизиты'
    if path == 'CompanyName':
        v = req.get('RQ_COMPANY_FULL_NAME') or req.get('RQ_COMPANY_NAME') or company.get('TITLE') or ''
        return v, 'Реквизиты → название компании'
    if path == 'FullAddress':
        return payti.auto_value('firm.actualAddress', ctx)
    if path == 'InstallmentPlace':
        v, _ = payti.auto_value('firm.actualAddress', ctx)
        return v, 'Как адрес установки'
    if path == 'FormatVersion':
        return '4', 'По умолчанию: ФФД 1.2'
    if path == 'ReregReasons':
        return '', 'Укажите поле CRM или значение'
    if path == 'Internet':
        return 'да', 'По умолчанию'
    if path in BOOLS:
        return 'нет', 'По умолчанию'
    return '', 'Не определяется автоматически'


def normalize(path, value):
    if path == 'OfdPassword':
        return str(value or '')
    if path == 'OfdLogin':
        return str(value or '').strip()
    if path == 'FormatVersion':
        return norm_ffd(value)
    if path in NUM_FIELDS:
        return digits(value)
    if path in DT_FIELDS:
        return parse_dt(value)
    if path in BOOLS:
        return 'да' if truthy(value) else 'нет'
    return ' '.join(str(value or '').split())


def resolve(bx, ctx, settings, overrides, only=None, purpose='InitialRegistration'):
    mapping = settings.get('mapping_json') or {}
    rows, values = [], {}
    for path, label in FIELDS:
        if only and path not in only:
            continue
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
        value = normalize(path, value)
        values[path] = value
        shown = ('••••••' if value else '') if path == 'OfdPassword' else value
        sc = scope_of(path)
        rows.append({'path': path, 'label': label, 'value': shown, 'source': source, 'method': method, 'scope': sc,
                     'applies': PURPOSE_LETTER.get(purpose, 'I') in sc})
    return rows, values


def creds_errors(values):
    errors = []
    if not values.get('OfdLogin'):
        errors.append('Не найден логин кабинета ОФД клиента: укажите поле CRM в настройках')
    if not values.get('OfdPassword'):
        errors.append('Не найден пароль кабинета ОФД клиента: укажите поле CRM в настройках')
    return errors


def creds_from_crm(conn, bx, deal_id):
    ctx = collect(bx, deal_id, [])
    _, values = resolve(bx, ctx, get_settings(conn), {}, only=SECRET_FIELDS)
    return values.get('OfdLogin', ''), values.get('OfdPassword', '')


def auth_for_deal(conn, bx, deal_id):
    try:
        login, password = creds_from_crm(conn, bx, deal_id)
    except Exception as e:
        raise OfdError(f'Не удалось прочитать логин и пароль ОФД из сделки: {e}')
    if not login or not password:
        raise OfdError('В сделке не найдены логин и пароль кабинета ОФД клиента')
    return ofd_auth(login, password)


def validate(values, purpose='InitialRegistration'):
    errors = []
    if len(values.get('Inn', '')) not in (10, 12):
        errors.append('ИНН должен содержать 10 или 12 цифр')
    if values.get('Kpp') and len(values['Kpp']) != 9:
        errors.append('КПП должен содержать 9 цифр')
    if not values.get('CompanyName'):
        errors.append('Не заполнено: название организации')
    if not values.get('SerialNumber'):
        errors.append('Не заполнено: заводской номер кассы')
    if len(values.get('FnNumber', '')) != 16:
        errors.append('Номер фискального накопителя должен содержать 16 цифр')
    if not values.get('Model'):
        errors.append('Не заполнено: модель кассы')
    if not values.get('FullAddress'):
        errors.append('Не заполнено: адрес установки кассы')
    if not values.get('InstallmentPlace'):
        errors.append('Не заполнено: место расчётов')
    if values.get('FormatVersion') not in ('2', '3', '4'):
        errors.append('Версия ФФД должна быть 2 (ФФД 1.05), 3 (ФФД 1.1) или 4 (ФФД 1.2)')
    if purpose in ('Reregistration', 'Unregistration') and len(values.get('RegNumber', '')) != 16:
        errors.append('Регистрационный номер кассы (РНМ) должен содержать 16 цифр')
    if purpose == 'Reregistration':
        flags, unknown = parse_rereg(values.get('ReregReasons'))
        if unknown:
            errors.append('Непонятные причины перерегистрации: ' + ', '.join(unknown))
        if not any(flags.values()):
            errors.append('Не указана причина перерегистрации')
        if flags.get('FnChanged'):
            for k in CLOSED_FIELDS:
                if not values.get(k):
                    errors.append(f'Замена ФН: не заполнено «{LABELS[k]}»')
    if purpose == 'Unregistration':
        flags, unknown = parse_unreg(values.get('UnregReason'))
        if unknown:
            errors.append('Непонятная причина снятия с учёта: ' + ', '.join(unknown))
        if not any(flags.values()):
            errors.append('Не указана причина снятия с учёта: утеряна, украдена или сломана')
    return errors


def validate_report(values):
    errors = []
    if not values.get('ReportDateTime'):
        errors.append('Не заполнена или не распознана дата и время отчёта о регистрации')
    if not values.get('ReportDocumentNumber'):
        errors.append('Не заполнен номер фискального документа отчёта')
    if not values.get('ReportFiscalSign'):
        errors.append('Не заполнен фискальный признак отчёта')
    return errors


def build_payload(values, purpose='InitialRegistration'):
    usage = {k: values.get(k) == 'да' for k in BOOLS}
    usage.update({'Gambling': False, 'Lottery': False, 'AutomatedDevice': False, 'Mobile': False, 'Banking': False, 'FormsForReports': False})
    company = {'Inn': values.get('Inn', '')}
    if values.get('Kpp'):
        company['Kpp'] = values['Kpp']
    kkt = {
        'SerialNumber': values.get('SerialNumber', ''),
        'FnNumber': values.get('FnNumber', ''),
        'Model': values.get('Model', ''),
        'InstallmentAddress': {'FullAddress': values.get('FullAddress', '')},
        'InstallmentPlace': values.get('InstallmentPlace', ''),
        'UsageMode': usage,
        'FormatVersion': int(values.get('FormatVersion') or 4),
    }
    if purpose in ('Reregistration', 'Unregistration'):
        kkt['RegNumber'] = values.get('RegNumber', '')
    if purpose == 'Reregistration':
        flags, _ = parse_rereg(values.get('ReregReasons'))
        kkt['ReregistrationReasons'] = flags
        if flags.get('FnChanged'):
            kkt['ClosedFnDetails'] = {'FdDateTime': values.get('ClosedFdDateTime', ''), 'FdNumber': values.get('ClosedFdNumber', ''), 'FpValue': values.get('ClosedFpValue', '')}
            kkt['InstalledFnDetails'] = {'FdDateTime': values.get('InstalledFdDateTime', ''), 'FdNumber': values.get('InstalledFdNumber', ''), 'FpValue': values.get('InstalledFpValue', '')}
    if purpose == 'Unregistration':
        kkt['UnregistrationReasons'] = parse_unreg(values.get('UnregReason'))[0]
    return {'Purpose': purpose, 'CompanyDetails': company, 'KktDetails': kkt}


def build_report_payload(values):
    return {'KktDetails': {'FiscalDocumentData': {
        'DateTime': values.get('ReportDateTime', ''),
        'DocumentNumber': values.get('ReportDocumentNumber', ''),
        'Signature': values.get('ReportFiscalSign', ''),
    }}}


def safe_json(r):
    try:
        return r.json()
    except Exception:
        return {'raw': r.text[:500]}


def err_message(body, http_status):
    if isinstance(body, dict):
        errs = body.get('Errors') or body.get('errors')
        err = (errs[0] if isinstance(errs, list) and errs else None) or body.get('Error') or body.get('error')
        if isinstance(err, dict):
            text = f"{err.get('Code', '')} {err.get('Message', '')}".strip()
            if text:
                return text
        elif err:
            return str(err)[:300]
    return f'ОФД вернул {http_status}'


def ofd_auth(login, password):
    try:
        r = requests.post(f'{OFD_API}/Authorization/CreateAuthToken', json={'Login': login, 'Password': password}, timeout=10)
    except Exception as e:
        raise OfdError(f'Сеть или таймаут при входе в ОФД: {e}', network=True)
    body = safe_json(r)
    token = ((body.get('Data') or {}).get('AuthToken')) if isinstance(body, dict) else None
    if r.status_code != 200 or not token:
        raise OfdError('ОФД не принял логин и пароль: ' + err_message(body, r.status_code), r.status_code)
    return token


def ofd_call(method, path, token, body=None):
    try:
        r = requests.request(method, f'{OFD_API}/integration/v1/kkt/registration{path}', params={'AuthToken': token}, json=body, timeout=15)
    except Exception as e:
        raise OfdError(f'Сеть или таймаут: {e}', network=True)
    data = safe_json(r)
    ok = r.status_code == 200 and isinstance(data, dict) and (data.get('Success') is True or data.get('Status') == 'Success')
    if not ok:
        raise OfdError(err_message(data, r.status_code), r.status_code, body=data)
    return data.get('Data') or {}


def access_check():
    key = os.environ.get('OFD_API_KEY', '')
    out = {'partnerKeySet': bool(key), 'probes': []}
    base = f'{OFD_API}/integration/v1/kkt/registration'
    fake = '00000000-0000-0000-0000-000000000001'
    tests = [
        ('POST пустая заявка, партнёрский ключ', 'POST', base, key, {}),
        ('POST пустая заявка, неверный токен', 'POST', base, 'invalid-token-000', {}),
        ('GET статус, партнёрский ключ', 'GET', f'{base}/{fake}', key, None),
        ('GET статус, неверный токен', 'GET', f'{base}/{fake}', 'invalid-token-000', None),
        ('Партнёрский API (создание ЛК), партнёрский ключ', 'POST', 'https://ofd.ru/api/integration/partner/v2/PartnerCreateClientCabinet', key, {}),
    ]
    for name, method, url, tok, body in tests:
        if not tok:
            out['probes'].append({'name': name, 'skipped': True})
            continue
        try:
            r = requests.request(method, url, params={'AuthToken': tok}, json=body, timeout=10)
            out['probes'].append({'name': name, 'http': r.status_code, 'body': r.text[:200]})
        except Exception as e:
            out['probes'].append({'name': name, 'error': str(e)})
    p = {x['name']: x for x in out['probes']}
    a, b = p.get('POST пустая заявка, партнёрский ключ', {}), p.get('POST пустая заявка, неверный токен', {})
    out['partnerKeyAccepted'] = bool(a.get('http') and b.get('http') and a['http'] != b['http'] and a['http'] != 403)
    return out


def add_event(conn, app_id, step, ok=True, info=''):
    cur = conn.cursor()
    cur.execute("INSERT INTO fns_events (application_id, step, ok, info) VALUES (%s, %s, %s, %s)", (app_id, step, ok, str(info or '')[:1000]))
    conn.commit()
    cur.close()


def update_app(conn, app_id, **kw):
    sets, vals = [], []
    for k, v in kw.items():
        sets.append(f'{k} = %s')
        vals.append(Json(v) if isinstance(v, (dict, list)) else v)
    cur = conn.cursor()
    cur.execute(f"UPDATE fns_applications SET {', '.join(sets)}, updated_at = NOW() WHERE id = %s", vals + [app_id])
    conn.commit()
    cur.close()


def insert_app(conn, ctx, values, rows, payload, status, source, token=None, ofd_id=None, err=None, resp_payload=None, purpose='InitialRegistration'):
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO fns_applications
        (public_token, deal_id, company_id, contact_id, requisite_id, status, inn, company_name, serial_number, fn_number,
         model, full_address, install_place, fields_json, request_payload, ofd_application_id, error_message, response_payload,
         source, purpose, stage, expires_at)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'application', NOW() + INTERVAL '14 days') RETURNING id""",
        (token, ctx['deal_id'], str(ctx.get('company_id') or ''), str(ctx.get('contact_id') or ''), str(ctx.get('requisite_id') or ''),
         status, values.get('Inn'), values.get('CompanyName'), values.get('SerialNumber'), values.get('FnNumber'),
         values.get('Model'), values.get('FullAddress'), values.get('InstallmentPlace'), Json(rows), Json(payload),
         ofd_id, err, Json(resp_payload) if resp_payload is not None else None, source, purpose),
    )
    app_id = cur.fetchone()['id']
    conn.commit()
    cur.close()
    return app_id


def row_by_token(conn, token):
    if not token or len(token) > 80:
        return None
    cur = conn.cursor()
    cur.execute("SELECT *, (expires_at < NOW()) AS expired FROM fns_applications WHERE public_token = %s", (token,))
    row = cur.fetchone()
    cur.close()
    return row


def title_of(purpose):
    return PURPOSES.get(purpose) or ('Отчёт о регистрации кассы' if purpose == 'Report' else 'Заявка в ФНС')


def ofd_note(bx, deal_id, purpose, title, data=None, error=None, raw=None):
    lines = [f'ОФД · {title_of(purpose)}', title]
    if isinstance(data, dict):
        kkt = data.get('KktDetails') or {}
        for label, val in (('Id заявки', data.get('Id')), ('Статус', data.get('Status')), ('Этап', data.get('Stage')),
                           ('РНМ', kkt.get('RegNumber')), ('Причина', data.get('StatusReason'))):
            if val:
                lines.append(f'{label}: {val}')
    if error:
        lines.append(f'Ошибка: {error}')
    if raw:
        lines.append('Ответ ОФД: ' + json.dumps(raw, ensure_ascii=False, default=str)[:600])
    try:
        payti.comment(bx, deal_id, '\n'.join(lines), [])
    except Exception:
        pass


def pick_purpose(bx, ctx, settings, param):
    p = purpose_from_param(param)
    if p:
        return p, 'Указано в запросе'
    ent, fld = settings.get('purpose_entity'), settings.get('purpose_field')
    if not (ent and fld):
        return 'InitialRegistration', 'По умолчанию: регистрация (правило в настройках не задано)'
    try:
        raw = (ctx.get(str(ent).lower()) or {}).get(fld)
        val = str(entity_value(bx, ctx, ent, fld) or '').strip()
    except Exception:
        raw, val = '', ''
    have = {str(x).strip().lower() for x in (raw if isinstance(raw, list) else [raw])} | {x.strip().lower() for x in val.split(',')}
    have.discard('')
    if not have:
        return None, f'Поле назначения заявки ({fld}) в сделке пустое'
    for purpose, want in (settings.get('purpose_values') or {}).items():
        if purpose in PURPOSES and have & set(tokens(want)):
            return purpose, f'Правило: {fld} = {val}'
    for h in have:
        if purpose_from_param(h):
            return purpose_from_param(h), f'Значение поля {fld}: {val}'
    return None, f'Значение «{val}» поля {fld} не подходит ни к одному назначению. Укажите соответствие в настройках'


def prepare(conn, bx, deal_id, overrides, steps, need_creds=False, purpose_param=None, ctx=None):
    settings = get_settings(conn)
    ctx = ctx or collect(bx, deal_id, steps)
    purpose, src = pick_purpose(bx, ctx, settings, purpose_param)
    if not purpose:
        steps.append({'step': 'Назначение заявки', 'ok': False, 'info': src})
        return settings, ctx, [], {}, [src], None, src
    steps.append({'step': 'Назначение заявки', 'ok': True, 'info': f'{title_of(purpose)} ({src})'})
    if purpose == 'Report':
        rows, values = resolve(bx, ctx, settings, overrides, only=REPORT_FIELDS + SECRET_FIELDS, purpose='Report')
        errors = validate_report(values) + (creds_errors(values) if need_creds else [])
    else:
        rows, values = resolve(bx, ctx, settings, overrides, purpose=purpose)
        errors = validate(values, purpose) + (creds_errors(values) if need_creds else [])
    steps.append({'step': 'Проверка', 'ok': not errors, 'info': '; '.join(errors) or 'Всё заполнено'})
    return settings, ctx, rows, values, errors, purpose, src


def link_for(base, token):
    return f"{(base or '').rstrip('/')}/sign/{token}"


def create_application(conn, bx, deal_id, overrides, mode, force, source, origin='', purpose_param=None):
    steps = []
    result = {'ok': False, 'dealId': deal_id, 'mode': mode, 'steps': steps}
    test = mode == 'test'
    settings, ctx, rows, values, errors, purpose, purpose_src = prepare(conn, bx, deal_id, overrides, steps, need_creds=not test, purpose_param=purpose_param)
    base = (origin or settings.get('sign_base_url') or '').rstrip('/')
    result.update(purpose=purpose, purposeSource=purpose_src)

    if not purpose:
        if not test:
            ofd_note(bx, deal_id, None, 'Заявка не создана: не определено назначение', error=purpose_src)
        result.update(status='validation_failed', error=purpose_src)
        return result
    if purpose == 'Report':
        return do_report(conn, bx, ctx, settings, values, rows, errors, steps, result, test, source, base)

    if not test and not force:
        cur = conn.cursor()
        cur.execute(
            """SELECT id, status, public_token, (expires_at < NOW()) AS expired FROM fns_applications
            WHERE deal_id = %s AND purpose = %s AND public_token IS NOT NULL
            AND status IN ('created','awaiting_signature','sent_to_fns','report_needed','approved')
            ORDER BY id DESC LIMIT 1""", (str(deal_id), purpose))
        prev = cur.fetchone()
        cur.close()
        if prev and prev['status'] in ('sent_to_fns', 'approved', 'report_needed'):
            msg = 'Заявка ждёт отчёта о регистрации: запустите назначение «Отчёт о регистрации»' if prev['status'] == 'report_needed' else 'По этой сделке такая заявка уже отправлена в ФНС'
            result.update(status='already_registered', error=msg)
            return result
        if prev and not prev['expired']:
            result.update(ok=True, status='link_exists', applicationId=prev['id'], link=link_for(base, prev['public_token']), error=None)
            return result

    payload = build_payload(values, purpose) if values else {}
    result.update(request=payload)

    if errors:
        app_id = insert_app(conn, ctx, values, rows, payload, 'validation_failed', source, err='; '.join(errors), purpose=purpose)
        for s in steps:
            add_event(conn, app_id, s['step'], s['ok'], s['info'])
        if not test:
            ofd_note(bx, deal_id, purpose, 'Заявка не создана, не хватает данных:\n- ' + '\n- '.join(errors))
        result.update(status='validation_failed', applicationId=app_id, error='; '.join(errors))
        return result

    token = secrets.token_urlsafe(24)
    data = None
    if test:
        app_id = insert_app(conn, ctx, values, rows, payload, 'test_created', source, token=token, purpose=purpose)
        steps.append({'step': 'Тестовая заявка', 'ok': True, 'info': 'Запросы в ОФД не отправлялись'})
    else:
        try:
            ofd_token = ofd_auth(values['OfdLogin'], values['OfdPassword'])
            data = ofd_call('POST', '', ofd_token, payload)
        except OfdError as e:
            status = 'temporary_error' if e.network else ('ofd_validation_error' if e.http_status == 400 else 'ofd_error')
            app_id = insert_app(conn, ctx, values, rows, payload, status, source, err=str(e), resp_payload=e.body, purpose=purpose)
            steps.append({'step': 'Заявка в ОФД', 'ok': False, 'info': str(e)})
            for s in steps:
                add_event(conn, app_id, s['step'], s['ok'], s['info'])
            ofd_note(bx, deal_id, purpose, 'Заявка не создана', error=str(e), raw=e.body)
            result.update(status=status, applicationId=app_id, error=str(e))
            return result
        app_id = insert_app(conn, ctx, values, rows, payload, 'created', source, token=token, ofd_id=data.get('Id'), resp_payload=data, purpose=purpose)
        steps.append({'step': 'Заявка в ОФД', 'ok': True, 'info': f"Id {data.get('Id')}, статус {data.get('Status')}"})

    link = link_for(base, token)
    for s in steps:
        add_event(conn, app_id, s['step'], s['ok'], s['info'])
    add_event(conn, app_id, 'Ссылка для подписи', True, link)

    if not test:
        if settings.get('result_link_field'):
            try:
                bx.call('crm.deal.update', {'id': deal_id, 'fields': {settings['result_link_field']: link}})
            except Exception as e:
                steps.append({'step': 'Запись в сделку', 'ok': False, 'info': str(e)})
        ofd_note(bx, deal_id, purpose, f'Заявка создана.\nСсылка для подписи клиентом (КЭП, КриптоПро): {link}\nДействует {LINK_DAYS} дней.', data=data)

    result.update(ok=True, status='test_created' if test else 'created', applicationId=app_id, link=link)
    return result


def do_report(conn, bx, ctx, settings, values, rows, errors, steps, result, test, source, base):
    deal_id = ctx['deal_id']
    result.update(fields=rows)
    cur = conn.cursor()
    cur.execute("SELECT * FROM fns_applications WHERE deal_id = %s AND purpose = 'InitialRegistration' AND status = %s ORDER BY id DESC LIMIT 1",
                (str(deal_id), 'test_signed' if test else 'report_needed'))
    app = cur.fetchone()
    cur.close()
    payload = build_report_payload(values) if values else {}
    result.update(request=payload)
    if not app:
        msg = 'Нет заявки на регистрацию, которая ждёт отчёта. Обновите статус заявки в журнале после ответа ФНС'
        if not test:
            ofd_note(bx, deal_id, 'Report', 'Отчёт не отправлен', error=msg)
        result.update(status='no_application', error=msg)
        return result
    if errors:
        add_event(conn, app['id'], 'Отчёт о регистрации', False, '; '.join(errors))
        if not test:
            ofd_note(bx, deal_id, 'Report', 'Отчёт не отправлен, не хватает данных:\n- ' + '\n- '.join(errors))
        result.update(status='validation_failed', applicationId=app['id'], error='; '.join(errors))
        return result
    data = None
    if not test:
        try:
            data = ofd_call('PUT', f"/{app['ofd_application_id']}", ofd_auth(values['OfdLogin'], values['OfdPassword']), payload)
        except OfdError as e:
            add_event(conn, app['id'], 'Отчёт о регистрации', False, str(e))
            update_app(conn, app['id'], error_message=str(e))
            ofd_note(bx, deal_id, 'Report', 'Отчёт не принят ОФД', error=str(e), raw=e.body)
            result.update(status='temporary_error' if e.network else 'ofd_error', applicationId=app['id'], error=str(e))
            return result
    cur = conn.cursor()
    cur.execute("UPDATE fns_applications SET status = %s, stage = 'report', document_id = NULL, error_message = NULL, "
                "expires_at = NOW() + INTERVAL '14 days', updated_at = NOW() WHERE id = %s",
                ('test_created' if test else 'created', app['id']))
    conn.commit()
    cur.close()
    link = link_for(base, app['public_token'])
    add_event(conn, app['id'], 'Отчёт о регистрации', True, 'Данные отчёта внесены в заявку' + (' (тест, ОФД не вызывался)' if test else ''))
    add_event(conn, app['id'], 'Ссылка для подписи отчёта', True, link)
    if not test:
        ofd_note(bx, deal_id, 'Report', f'Данные отчёта внесены в заявку.\nСсылка для подписи отчёта клиентом: {link}\nДействует {LINK_DAYS} дней.', data=data)
    result.update(ok=True, status='test_created' if test else 'created', applicationId=app['id'], link=link)
    return result


def sync_status(conn, bx, row):
    if not row.get('ofd_application_id') or str(row['status']).startswith('test_'):
        return row
    try:
        data = ofd_call('GET', f"/{row['ofd_application_id']}", auth_for_deal(conn, bx, row['deal_id']))
    except OfdError as e:
        add_event(conn, row['id'], 'Проверка статуса', False, str(e))
        if bx is not None:
            ofd_note(bx, row['deal_id'], row.get('purpose'), 'Не удалось проверить статус', error=str(e), raw=e.body)
        return row
    ofd_status, stage = data.get('Status'), data.get('Stage')
    new_status = STATUS_MAP.get(ofd_status, row['status'])
    if row.get('purpose') == 'InitialRegistration' and row.get('stage') == 'application' and stage == 'Finalization' and ofd_status == 'New':
        new_status = 'report_needed'
    elif row.get('stage') == 'report' and ofd_status == 'New':
        new_status = 'created'
    reason = data.get('StatusReason') or ''
    kkt = data.get('KktDetails') or {}
    rnm = digits(kkt.get('RegNumber'))
    if len(rnm) != 16:
        agr = digits(data.get('KktAgreementId'))
        rnm = agr if len(agr) == 16 else ''
    rnm = rnm or row.get('rnm') or ''
    update_app(conn, row['id'], status=new_status, status_reason=reason, rnm=rnm, response_payload=data)
    add_event(conn, row['id'], 'Проверка статуса', True, f"{ofd_status}/{stage}{' · ' + reason if reason else ''}{' · РНМ ' + rnm if rnm else ''}")
    if new_status != row['status'] and bx is not None:
        settings = get_settings(conn)
        if rnm and not row.get('rnm') and settings.get('result_rnm_field'):
            try:
                bx.call('crm.deal.update', {'id': row['deal_id'], 'fields': {settings['result_rnm_field']: rnm}})
            except Exception:
                pass
        hint = {'approved': 'ФНС приняла заявку.', 'rejected': 'ФНС отклонила заявку.',
                'report_needed': 'ФНС присвоила РНМ. Чтобы завершить регистрацию, пробейте отчёт о регистрации на кассе и запустите назначение «Отчёт о регистрации».'}.get(new_status, 'Статус заявки изменился.')
        ofd_note(bx, row['deal_id'], row.get('purpose'), hint, data=data)
    row.update(status=new_status, status_reason=reason, rnm=rnm)
    return row


def public_view(row):
    return {
        'ok': True, 'status': row['status'], 'expired': bool(row.get('expired')), 'test': str(row['status']).startswith('test_'),
        'purpose': row.get('purpose') or 'InitialRegistration', 'stage': row.get('stage') or 'application',
        'title': title_of('Report' if row.get('stage') == 'report' else row.get('purpose')),
        'companyName': row.get('company_name'), 'inn': row.get('inn'), 'serialNumber': row.get('serial_number'),
        'fnNumber': row.get('fn_number'), 'model': row.get('model'), 'address': row.get('full_address'),
        'place': row.get('install_place'), 'rnm': row.get('rnm'), 'reason': row.get('status_reason'),
        'signerName': row.get('signer_name'), 'expiresAt': row.get('expires_at'),
    }


def handle_public(conn, action, params, body):
    token = str(body.get('token') or params.get('token') or '')
    row = row_by_token(conn, token)
    if not row:
        return resp(404, {'ok': False, 'error': 'Ссылка недействительна'})

    if action == 'fns-public-get':
        if row['status'] == 'sent_to_fns' and not row.get('expired'):
            try:
                row = sync_status(conn, Bitrix(), row) or row
            except Exception:
                pass
        return resp(200, public_view(row))

    if action == 'fns-public-prepare' and (row.get('expired') or row['status'] not in SIGNABLE):
        return resp(400, {'ok': False, 'error': 'Ссылка устарела или заявка уже обработана'})
    test = str(row['status']).startswith('test_')

    if action == 'fns-public-prepare':
        given = ' '.join(str(body.get('givenName') or '').split())[:200]
        last = ' '.join(str(body.get('lastName') or '').split())[:200]
        position = ' '.join(str(body.get('position') or '').split())[:200]
        if not (given and last and position):
            return resp(400, {'ok': False, 'error': 'Не удалось прочитать фамилию, имя или должность из сертификата'})
        if test:
            text = f"ТЕСТОВЫЙ ДОКУМЕНТ. {title_of('Report' if row.get('stage') == 'report' else row.get('purpose'))}. ИНН {row['inn']}, касса {row['serial_number']}, ФН {row['fn_number']}. Подписант: {last} {given}, {position}"
            doc = {'Id': 'test-document', 'Content': base64.b64encode(text.encode()).decode(), 'Description': 'Тестовый документ (в ОФД не отправляется)', 'FileName': 'test'}
        else:
            try:
                data = ofd_call('POST', f"/{row['ofd_application_id']}/prepareDocuments", auth_for_deal(conn, Bitrix(), row['deal_id']),
                                {'GivenName': given, 'LastName': last, 'Position': position})
            except OfdError as e:
                add_event(conn, row['id'], 'Подготовка к подписи', False, str(e))
                update_app(conn, row['id'], error_message=str(e))
                ofd_note(Bitrix(), row['deal_id'], row.get('purpose'), 'ОФД не подготовил документ для подписи', error=str(e), raw=e.body)
                return resp(502, {'ok': False, 'error': f'ОФД не подготовил документ: {e}'})
            docs = data.get('Documents') or []
            doc = next((d for d in docs if str(d.get('Signature')) == 'Unsigned'), docs[0] if docs else None)
            if not doc:
                add_event(conn, row['id'], 'Подготовка к подписи', False, 'ОФД не вернул документ')
                return resp(502, {'ok': False, 'error': 'ОФД не вернул документ для подписи'})
        update_app(conn, row['id'], status='test_awaiting_signature' if test else 'awaiting_signature', document_id=doc['Id'],
                   signer_name=f'{last} {given}', signer_position=position, error_message=None)
        add_event(conn, row['id'], 'Подготовка к подписи', True, f"Подписант: {last} {given}, {position}")
        return resp(200, {'ok': True, 'documentId': doc['Id'], 'content': doc['Content'], 'description': doc.get('Description'), 'fileName': doc.get('FileName')})

    if action == 'fns-public-sign':
        if row['status'] not in ('awaiting_signature', 'test_awaiting_signature') or row.get('expired'):
            return resp(400, {'ok': False, 'error': 'Заявка не ждёт подписи или ссылка устарела'})
        document_id = str(body.get('documentId') or '')
        signature = re.sub(r'\s+', '', str(body.get('signature') or ''))
        if document_id != str(row.get('document_id')) or len(signature) < 100:
            return resp(400, {'ok': False, 'error': 'Подпись не соответствует документу'})
        cur = conn.cursor()
        cur.execute("UPDATE fns_applications SET status = %s, updated_at = NOW() WHERE id = %s AND status = %s RETURNING id",
                    ('signing', row['id'], row['status']))
        locked = cur.fetchone()
        conn.commit()
        cur.close()
        if not locked:
            return resp(409, {'ok': False, 'error': 'Подпись уже отправляется'})
        if test:
            update_app(conn, row['id'], status='test_signed')
            add_event(conn, row['id'], 'Подпись', True, f'Тест: подпись получена ({len(signature)} символов), в ОФД не отправлялась')
            return resp(200, {'ok': True, 'status': 'test_signed'})
        try:
            ofd_call('POST', f"/{row['ofd_application_id']}/sign", auth_for_deal(conn, Bitrix(), row['deal_id']), {'DocumentId': document_id, 'Signature': signature})
        except OfdError as e:
            if e.network:
                update_app(conn, row['id'], status='sign_uncertain', error_message=str(e))
                add_event(conn, row['id'], 'Отправка подписи', False, f'{e}. Повторно не отправлять, проверьте статус')
                ofd_note(Bitrix(), row['deal_id'], row.get('purpose'), 'Нет ответа ОФД на отправку подписи. Повторно не отправляйте, проверьте статус заявки', error=str(e))
                return resp(502, {'ok': False, 'error': 'Не удалось получить ответ ОФД. Подпись могла дойти, повторно не отправляйте — сообщите менеджеру'})
            update_app(conn, row['id'], status='awaiting_signature', error_message=str(e))
            add_event(conn, row['id'], 'Отправка подписи', False, str(e))
            ofd_note(Bitrix(), row['deal_id'], row.get('purpose'), 'ОФД отклонил подпись', error=str(e), raw=e.body)
            return resp(502, {'ok': False, 'error': f'ОФД отклонил подпись: {e}'})
        update_app(conn, row['id'], status='sent_to_fns', error_message=None)
        add_event(conn, row['id'], 'Отправка подписи', True, 'Заявка подписана и отправлена в ФНС')
        what = 'отчёт о регистрации' if row.get('stage') == 'report' else title_of(row.get('purpose')).lower()
        ofd_note(Bitrix(), row['deal_id'], row.get('purpose'), f'Клиент подписал: {what}. Документы отправлены в ФНС, ответ придёт после проверки.')
        return resp(200, {'ok': True, 'status': 'sent_to_fns'})

    return resp(400, {'ok': False, 'error': 'Unknown action'})


def handle(event, action):
    params = event.get('queryStringParameters') or {}
    headers = {str(k).lower(): v for k, v in (event.get('headers') or {}).items()}
    body_raw = event.get('body') or ''
    if event.get('isBase64Encoded') and body_raw:
        body_raw = base64.b64decode(body_raw).decode('utf-8', 'ignore')
    body = json.loads(body_raw) if body_raw.strip().startswith('{') else {}

    conn = db()
    try:
        if action in PUBLIC:
            return handle_public(conn, action, params, body)

        if action == 'fns-hook':
            given = params.get('key') or headers.get('x-hook-key') or headers.get('x-api-key') or ''
            if not hook_key_valid(conn, given):
                return resp(401, {'ok': False, 'error': 'Неверный ключ'})
            deal_id = parse_deal_id(params, body_raw, headers)
            if not deal_id:
                return resp(400, {'ok': False, 'error': 'Не указан номер сделки'})
            mode = 'test' if params.get('mode') == 'test' else 'real'
            result = create_application(conn, Bitrix(), deal_id, {}, mode, False, 'hook', purpose_param=params.get('purpose'))
            return resp(200, {'ok': result.get('ok', False), 'status': result.get('status'), 'dealId': deal_id, 'purpose': result.get('purpose'),
                              'mode': mode, 'link': result.get('link'), 'error': result.get('error')})

        cur = conn.cursor()
        cur.execute("SELECT id FROM api_keys WHERE api_key = %s AND is_active = true", (headers.get('x-api-key') or '',))
        if not cur.fetchone():
            return resp(401, {'error': 'Invalid API key'})
        cur.close()

        if action == 'fns-access-check':
            return resp(200, access_check())

        if action == 'fns-meta':
            return resp(200, {
                'fields': [{'path': p, 'label': l, 'scope': scope_of(p), 'options': OPTIONS.get(p)} for p, l in FIELDS],
                'purposes': PURPOSES,
                'entities': payti.ENTITIES,
                'bitrixConfigured': bool(os.environ.get('BITRIX_WEBHOOK_URL')),
            })

        if action == 'fns-settings':
            if event.get('httpMethod') == 'POST':
                sets, vals = [], []
                if 'mapping_json' in body:
                    sets.append('mapping_json = %s')
                    vals.append(Json(body['mapping_json']))
                if 'purpose_values' in body:
                    sets.append('purpose_values = %s')
                    vals.append(Json(body['purpose_values']))
                for c in ('result_link_field', 'result_rnm_field', 'sign_base_url', 'purpose_entity', 'purpose_field'):
                    if c in body:
                        sets.append(f'{c} = %s')
                        vals.append(body[c])
                if sets:
                    cur = conn.cursor()
                    cur.execute(f"UPDATE fns_settings SET {', '.join(sets)}, updated_at = NOW() WHERE connection_key = 'default'", vals)
                    conn.commit()
                    cur.close()
            return resp(200, {'settings': get_settings(conn)})

        if action == 'fns-history':
            cur = conn.cursor()
            cur.execute(
                """SELECT id, deal_id, status, purpose, stage, inn, company_name, serial_number, fn_number, rnm, error_message, source,
                public_token, created_at, (expires_at < NOW()) AS expired FROM fns_applications ORDER BY created_at DESC LIMIT 30""")
            return resp(200, {'history': cur.fetchall(), 'baseUrl': get_settings(conn).get('sign_base_url')})

        if action == 'fns-events':
            cur = conn.cursor()
            cur.execute("SELECT step, ok, info, created_at FROM fns_events WHERE application_id = %s ORDER BY id", (digits(params.get('id')) or '0',))
            events = cur.fetchall()
            cur.execute("SELECT request_payload, response_payload FROM fns_applications WHERE id = %s", (digits(params.get('id')) or '0',))
            app = cur.fetchone() or {}
            return resp(200, {'events': events, 'request': app.get('request_payload'), 'response': app.get('response_payload')})

        bx = Bitrix()
        if not bx.url.startswith('http'):
            return resp(400, {'error': 'Не задан BITRIX_WEBHOOK_URL'})

        if action == 'fns-refresh':
            cur = conn.cursor()
            cur.execute("SELECT * FROM fns_applications WHERE id = %s", (digits(body.get('id')) or '0',))
            row = cur.fetchone()
            cur.close()
            if not row:
                return resp(404, {'error': 'Заявка не найдена'})
            row = sync_status(conn, bx, row)
            return resp(200, {'ok': True, 'status': row['status'], 'rnm': row.get('rnm'), 'reason': row.get('status_reason')})

        deal_id = digits(body.get('dealId') or params.get('dealId'))
        if not deal_id:
            return resp(400, {'error': 'Не указан ID сделки'})
        overrides = body.get('overrides') or {}

        if action == 'fns-preview':
            steps = []
            try:
                settings, ctx, rows, values, errors, purpose, purpose_src = prepare(conn, bx, deal_id, overrides, steps, purpose_param=body.get('purpose'))
            except Exception as e:
                steps.append({'step': 'Ошибка', 'ok': False, 'info': str(e)})
                return resp(200, {'ok': False, 'error': str(e), 'steps': steps})
            request = ({} if not purpose else build_report_payload(values) if purpose == 'Report' else build_payload(values, purpose))
            return resp(200, {'ok': not errors, 'dealId': deal_id, 'purpose': purpose, 'purposeSource': purpose_src,
                              'fields': [r for r in rows if r['applies'] or r['path'] in SECRET_FIELDS], 'errors': errors, 'steps': steps,
                              'links': links(bx, ctx), 'request': request,
                              'warnings': creds_errors(values) if values else []})

        if action == 'fns-create':
            mode = 'test' if body.get('mode') == 'test' else 'real'
            try:
                result = create_application(conn, bx, deal_id, overrides, mode, bool(body.get('force')), 'console', str(body.get('origin') or ''), purpose_param=body.get('purpose'))
            except Exception as e:
                return resp(200, {'ok': False, 'status': 'error', 'error': str(e)})
            return resp(200, result)

        return resp(400, {'error': 'Unknown action'})
    finally:
        conn.close()
