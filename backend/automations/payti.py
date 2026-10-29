import json
import os
import re
import secrets
import hmac
from urllib.parse import parse_qs, urlparse

import psycopg2
import requests
from psycopg2.extras import RealDictCursor, Json

ENVS = {
    'test': 'https://test-app.ecomkassa.ru/api/mobile/v1/payti',
    'prod': 'https://app.ecomkassa.ru/api/mobile/v1/payti',
}
FIRM_INFO = 'https://app.ecomkassa.ru/api/mobile/v1/firmInfo/'
TAX_CODES = ['GENERAL', 'SIMPLIFIED_INCOME', 'SIMPLIFIED_IN_OUT', 'SINGLE_INCOME_TAX', 'SINGLE_AGRICULTURE_TAX', 'PATENT']
FIELDS = [
    ('firm.firmName', 'Название компании'),
    ('firm.taxId', 'ИНН'),
    ('firm.taxVariant', 'Система налогообложения'),
    ('firm.legalAddress', 'Юридический адрес'),
    ('firm.actualAddress', 'Фактический адрес'),
    ('firm.phone', 'Телефон'),
    ('store.storeName', 'Название магазина'),
    ('store.storeAddress', 'Адрес магазина'),
    ('store.timezoneId', 'Часовой пояс'),
    ('user.login', 'Логин (email)'),
    ('user.password', 'Пароль'),
    ('user.cashier', 'Кассир'),
]
ENTITIES = {'deal': 'Сделка', 'company': 'Компания', 'contact': 'Контакт', 'requisite': 'Реквизиты'}
TAX_EXACT = {
    'усн доход': 'SIMPLIFIED_INCOME',
    'усн фн 36': 'SIMPLIFIED_INCOME',
    'усн доход - расход': 'SIMPLIFIED_IN_OUT',
    'общая': 'GENERAL',
    'общая фн 15/36': 'GENERAL',
    'общая фн 15': 'GENERAL',
    'общая фн 36': 'GENERAL',
    'патент': 'PATENT',
    'патент фн 36': 'PATENT',
    'енвд фн 36': 'SINGLE_INCOME_TAX',
}
TAX_WORDS = [
    (['доходы минус', '15%'], 'SIMPLIFIED_IN_OUT'),
    (['енвд', 'вменен'], 'SINGLE_INCOME_TAX'),
    (['есхн'], 'SINGLE_AGRICULTURE_TAX'),
    (['патент', 'псн'], 'PATENT'),
    (['усн', 'упрощен', '6%'], 'SIMPLIFIED_INCOME'),
    (['осно', 'общая'], 'GENERAL'),
]
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key, X-Hook-Key',
}
ACTIONS = {'meta', 'ping', 'settings', 'crm-fields', 'deal-preview', 'dry-run', 'register', 'history', 'hook'}


def resp(code, data):
    return {
        'statusCode': code,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'body': json.dumps(data, default=str, ensure_ascii=False),
        'isBase64Encoded': False,
    }


def db():
    return psycopg2.connect(os.environ['DATABASE_URL'], cursor_factory=RealDictCursor)


def hook_key_valid(conn, given):
    if not given:
        return False
    cur = conn.cursor()
    cur.execute(
        "SELECT id FROM api_keys WHERE api_key = %s AND is_active = true AND (expiry_date IS NULL OR expiry_date > NOW())",
        (str(given),),
    )
    row = cur.fetchone()
    if row:
        cur.execute("UPDATE api_keys SET last_used_at = NOW() WHERE id = %s", (row['id'],))
        conn.commit()
    cur.close()
    return row is not None


class Bitrix:
    def __init__(self):
        self.url = os.environ.get('BITRIX_WEBHOOK_URL', '').rstrip('/') + '/'
        p = urlparse(self.url)
        self.origin = f'{p.scheme}://{p.netloc}'
        self.meta_cache = {}

    def call(self, method, params=None):
        r = requests.post(self.url + method + '.json', json=params or {}, timeout=8)
        data = r.json()
        if 'error' in data:
            raise RuntimeError(f"{method}: {data.get('error_description') or data['error']}")
        return data.get('result')

    def fields(self, entity):
        if entity not in self.meta_cache:
            try:
                self.meta_cache[entity] = self.call(f'crm.{entity}.fields') or {}
            except Exception:
                self.meta_cache[entity] = {}
        return self.meta_cache[entity]

    def enum_name(self, entity, code, value):
        meta = self.fields(entity).get(code) or {}
        for it in meta.get('items') or []:
            if str(it.get('ID')) == str(value):
                return it.get('VALUE')
        return value


def digits(s):
    return re.sub(r'\D', '', str(s or ''))


def norm_phone(s):
    d = digits(s)
    if len(d) == 11 and d[0] == '8':
        d = '7' + d[1:]
    if len(d) == 10:
        d = '7' + d
    return d


def payti_phone(s):
    d = digits(s)
    d = norm_phone(d)
    return f'+{d}' if len(d) == 11 and d[0] == '7' else ''


def multi_first(v, skip=None):
    if isinstance(v, list):
        for it in v:
            val = (it or {}).get('VALUE')
            if val and not (skip and skip(val)):
                return val
        return ''
    return v or ''


def fmt_address(a):
    parts = [a.get(k) for k in ('POSTAL_CODE', 'PROVINCE', 'REGION', 'CITY', 'ADDRESS_1', 'ADDRESS_2')]
    return ', '.join(str(p).strip() for p in parts if p and str(p).strip())


def tax_to_code(text):
    t = str(text or '').strip()
    if not t:
        return ''
    if t.upper() in TAX_CODES:
        return t.upper()
    low = t.lower()
    if low in TAX_EXACT:
        return TAX_EXACT[low]
    for words, code in TAX_WORDS:
        if any(w in low for w in words):
            return code
    return ''


def gen_password():
    alpha_u = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    alpha_l = 'abcdefghijkmnopqrstuvwxyz'
    alpha_d = '23456789'
    allc = alpha_u + alpha_l + alpha_d
    chars = [secrets.choice(alpha_u), secrets.choice(alpha_l), secrets.choice(alpha_d)]
    chars += [secrets.choice(allc) for _ in range(9)]
    secrets.SystemRandom().shuffle(chars)
    return ''.join(chars)


def fix_case(name):
    name = ' '.join(str(name or '').split())
    return name.title() if name and name == name.upper() else name


def get_settings(conn):
    cur = conn.cursor()
    cur.execute("SELECT * FROM payti_mapping_settings WHERE connection_key = 'default'")
    row = cur.fetchone()
    if not row:
        cur.execute("INSERT INTO payti_mapping_settings (connection_key) VALUES ('default') RETURNING *")
        row = cur.fetchone()
        conn.commit()
    cur.close()
    row['mapping_json'] = row.get('mapping_json') or {}
    return row


def cfg_mode(cfg):
    return str(cfg.get('mode') or cfg.get('type') or 'AUTO').upper()


def cfg_entity(cfg):
    return str(cfg.get('entity') or 'deal').lower()


def entity_value(bx, ctx, entity, code):
    entity = str(entity or 'deal').lower()
    data = ctx.get(entity) or {}
    v = data.get(code)
    if isinstance(v, list):
        if v and isinstance(v[0], dict):
            return multi_first(v)
        return ', '.join(str(bx.enum_name(entity, code, x)) for x in v)
    if v in (None, ''):
        return ''
    return bx.enum_name(entity, code, v)


def collect(bx, deal_id, steps):
    ctx = {'deal_id': str(deal_id), 'addr': {}}
    deal = bx.call('crm.deal.get', {'id': deal_id})
    if not deal:
        raise RuntimeError('Сделка не найдена')
    ctx['deal'] = deal
    steps.append({'step': 'Сделка', 'ok': True, 'info': deal.get('TITLE', '')})

    company_id = deal.get('COMPANY_ID')
    ctx['company_id'] = company_id if company_id and str(company_id) != '0' else None
    ctx['company'] = {}
    if ctx['company_id']:
        ctx['company'] = bx.call('crm.company.get', {'id': ctx['company_id']}) or {}
        steps.append({'step': 'Компания', 'ok': True, 'info': ctx['company'].get('TITLE', '')})
    else:
        steps.append({'step': 'Компания', 'ok': False, 'info': 'В сделке не указана'})

    contact = {}
    contact_id = None
    items = bx.call('crm.deal.contact.items.get', {'id': deal_id}) or []
    if items:
        primary = [i for i in items if i.get('IS_PRIMARY') == 'Y']
        contact_id = (primary or items)[0].get('CONTACT_ID')
        contact = bx.call('crm.contact.get', {'id': contact_id}) or {}
    ctx['contact'] = contact
    ctx['contact_id'] = contact_id
    steps.append({'step': 'Контакт', 'ok': bool(contact), 'info': ' '.join(str(contact.get(k) or '') for k in ('NAME', 'LAST_NAME')).strip() or 'Не найден'})

    req = {}
    req_id = None
    try:
        link = bx.call('crm.requisite.link.get', {'entityTypeId': 2, 'entityId': deal_id}) or {}
        req_id = link.get('REQUISITE_ID')
        if req_id and str(req_id) != '0':
            req = bx.call('crm.requisite.get', {'id': req_id}) or {}
    except Exception:
        req = {}
    if not req and ctx['company_id']:
        lst = bx.call('crm.requisite.list', {
            'filter': {'ENTITY_TYPE_ID': 4, 'ENTITY_ID': ctx['company_id'], 'ACTIVE': 'Y'},
            'select': ['*'],
        }) or []
        lst = [r for r in lst if r.get('RQ_INN')]
        if lst:
            req = lst[0]
            req_id = req.get('ID')
    ctx['requisite'] = req
    ctx['requisite_id'] = req_id if req else None
    steps.append({'step': 'Реквизиты', 'ok': bool(req), 'info': req.get('RQ_INN', '') or 'Не найдены'})

    if req:
        for a in bx.call('crm.address.list', {'filter': {'ENTITY_TYPE_ID': 8, 'ENTITY_ID': req.get('ID')}}) or []:
            ctx['addr'][('req', str(a.get('TYPE_ID')))] = fmt_address(a)
    if ctx['company_id']:
        for a in bx.call('crm.address.list', {'filter': {'ENTITY_TYPE_ID': 4, 'ENTITY_ID': ctx['company_id']}}) or []:
            ctx['addr'][('company', str(a.get('TYPE_ID')))] = fmt_address(a)
    steps.append({'step': 'Адреса', 'ok': True, 'info': f'В CRM найдено: {len(ctx["addr"])}' if ctx['addr'] else 'В CRM адресов нет, берём из справочника по ИНН'})
    return ctx


def is_ip(req, company):
    name = (req.get('RQ_COMPANY_FULL_NAME') or req.get('RQ_COMPANY_NAME') or company.get('TITLE') or '').lower()
    return str(req.get('PRESET_ID')) == '3' or name.startswith('ип ') or 'индивидуальный предприниматель' in name


def valid_fio(parts):
    parts = [p for p in parts if p]
    return len(parts) >= 2 and all(len(p.strip('.')) > 1 and '.' not in p for p in parts)


def auto_value(path, ctx):
    req, company, contact = ctx['requisite'], ctx['company'], ctx['contact']
    addr = ctx['addr']
    if path == 'firm.firmName':
        v = req.get('RQ_COMPANY_FULL_NAME') or req.get('RQ_COMPANY_NAME') or company.get('TITLE') or ''
        return v, 'Реквизиты → название компании'
    if path == 'firm.taxId':
        return digits(req.get('RQ_INN')), 'Реквизиты'
    if path == 'firm.taxVariant':
        return '', 'Не определяется автоматически'
    if path == 'firm.legalAddress':
        for k in (('req', '1'), ('req', '4'), ('company', '1'), ('company', '4')):
            if addr.get(k):
                return addr[k], 'Адрес реквизитов' if k[0] == 'req' else 'Адрес компании'
        inn = digits(req.get('RQ_INN'))
        if inn:
            try:
                r = requests.get(FIRM_INFO + inn, timeout=6)
                if r.status_code == 200:
                    d = r.json()
                    d = (d.get('payload') or d.get('data') or d) if isinstance(d, dict) else {}
                    v = d.get('address') or d.get('legalAddress') or ''
                    if v:
                        return v, 'Справочник по ИНН'
            except Exception:
                pass
        return '', 'Не найден'
    if path == 'firm.actualAddress':
        for k in (('req', '6'), ('req', '11')):
            if addr.get(k):
                return addr[k], 'Адрес реквизитов (фактический)'
        v, _ = auto_value('firm.legalAddress', ctx)
        return v, 'Как юридический адрес'
    if path == 'firm.phone':
        for src, name in ((multi_first(contact.get('PHONE')), 'Контакт'), (req.get('RQ_PHONE'), 'Реквизиты'), (multi_first(company.get('PHONE')), 'Компания')):
            p = payti_phone(src)
            if p:
                return p, name
        return '', 'Не найден'
    if path == 'store.storeName':
        return company.get('TITLE') or auto_value('firm.firmName', ctx)[0], 'Название компании'
    if path == 'store.storeAddress':
        return auto_value('firm.actualAddress', ctx)[0], 'Как фактический адрес'
    if path == 'store.timezoneId':
        return 'Europe/Moscow', 'По умолчанию'
    if path == 'user.login':
        v = multi_first(contact.get('EMAIL'), skip=lambda x: 'wappi' in x.lower())
        return v.strip().lower(), 'Email основного контакта'
    if path == 'user.password':
        return ctx.get('password', ''), 'Сгенерирован'
    if path == 'user.cashier':
        if is_ip(req, company):
            fio = [req.get('RQ_LAST_NAME'), req.get('RQ_FIRST_NAME'), req.get('RQ_SECOND_NAME')]
            if valid_fio(fio):
                return fix_case(' '.join(p for p in fio if p)), 'ИП: ФИО из реквизитов'
            name = req.get('RQ_COMPANY_FULL_NAME') or req.get('RQ_COMPANY_NAME') or company.get('TITLE') or ''
            name = re.sub(r'(?i)^(индивидуальный предприниматель|ип)\s+', '', name).strip()
            if valid_fio(name.split()):
                return fix_case(name), 'ИП: ФИО из названия'
        elif req.get('RQ_DIRECTOR'):
            return fix_case(req.get('RQ_DIRECTOR')), 'ООО: генеральный директор'
        fio = ' '.join(str(contact.get(k) or '').strip() for k in ('LAST_NAME', 'NAME', 'SECOND_NAME') if contact.get(k)).strip()
        return fix_case(fio), 'ФИО контакта'
    return '', ''


def resolve_fields(bx, ctx, settings, overrides):
    mapping = settings.get('mapping_json') or {}
    out = []
    values = {}
    for path, label in FIELDS:
        cfg = mapping.get(path) or {}
        mtype = cfg_mode(cfg)
        value, source, method = '', '', mtype
        if path in (overrides or {}) and str(overrides[path]).strip() != '':
            value, source, method = str(overrides[path]).strip(), 'Ввод вручную', 'MANUAL'
        elif mtype == 'STATIC':
            value, source = cfg.get('value', ''), 'Фиксированное значение'
        elif mtype == 'CRM':
            value = entity_value(bx, ctx, cfg_entity(cfg), cfg.get('field', ''))
            source = f"{ENTITIES.get(cfg_entity(cfg), '')}: {cfg.get('field', '')}"
            if not str(value or '').strip():
                value, auto_src = auto_value(path, ctx)
                source += f' (пусто, взято по умолчанию: {auto_src})' if value else ' (пусто)'
        else:
            value, source = auto_value(path, ctx)
        if path == 'firm.taxVariant':
            value = tax_to_code(value)
        elif path == 'firm.taxId':
            value = digits(value)
        elif path == 'firm.phone':
            raw = value
            value = payti_phone(raw)
            if raw and not value:
                value = digits(raw)
        elif path == 'user.login':
            value = str(value or '').strip().lower()
        values[path] = value
        out.append({'path': path, 'label': label, 'value': value, 'source': source, 'method': method})
    return out, values


def build_payload(values):
    return {
        'firm': {k.split('.')[1]: values[k] for k, _ in FIELDS if k.startswith('firm.')},
        'store': {k.split('.')[1]: values[k] for k, _ in FIELDS if k.startswith('store.')},
        'user': {k.split('.')[1]: values[k] for k, _ in FIELDS if k.startswith('user.')},
    }


def masked(payload):
    p = json.loads(json.dumps(payload))
    if 'password' in p.get('user', {}):
        p['user']['password'] = '***'
    return p


def validate(values, mode):
    errors = []
    required = [
        ('firm.firmName', 'название компании'), ('firm.legalAddress', 'юридический адрес'),
        ('firm.actualAddress', 'фактический адрес'), ('firm.phone', 'телефон'),
        ('store.storeName', 'название магазина'), ('store.storeAddress', 'адрес магазина'),
        ('store.timezoneId', 'часовой пояс'), ('user.cashier', 'кассир'),
    ]
    for path, label in required:
        if not values.get(path):
            errors.append(f'Не заполнено: {label}')
    if len(values.get('firm.taxId', '')) not in (10, 12):
        errors.append('ИНН должен содержать 10 или 12 цифр')
    phone = values.get('firm.phone', '')
    if phone and not re.match(r'^\+7\d{10}$', phone):
        errors.append('Телефон должен быть российским, 11 цифр: +7XXXXXXXXXX')
    if not values.get('firm.taxVariant'):
        errors.append('Система налогообложения не определена или её нет в списке Payti')
    login = values.get('user.login', '')
    if not login or not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', login) or 'wappi' in login:
        errors.append('Email пустой, некорректный или служебный адрес мессенджера')
    if len(values.get('user.password', '')) < 8:
        errors.append('Пароль короче 8 символов')
    if mode not in ('A', 'R'):
        errors.append('Режим должен быть A или R')
    return errors


def get_password(conn, deal_id):
    cur = conn.cursor()
    cur.execute("SELECT password FROM payti_deal_passwords WHERE deal_id = %s", (str(deal_id),))
    row = cur.fetchone()
    if row:
        cur.close()
        return row['password']
    pw = gen_password()
    cur.execute("INSERT INTO payti_deal_passwords (deal_id, password) VALUES (%s, %s) ON CONFLICT (deal_id) DO NOTHING", (str(deal_id), pw))
    conn.commit()
    cur.execute("SELECT password FROM payti_deal_passwords WHERE deal_id = %s", (str(deal_id),))
    pw = cur.fetchone()['password']
    cur.close()
    return pw


def rule_match(bx, ctx, entity, field, value):
    if not (entity and field and value):
        return None
    entity = str(entity).lower()
    raw = (ctx.get(entity) or {}).get(field)
    raws = [str(x).strip().lower() for x in raw] if isinstance(raw, list) else [str(raw).strip().lower()]
    names = [x.strip().lower() for x in str(entity_value(bx, ctx, entity, field)).split(',')]
    want = str(value).strip().lower()
    return want in raws or want in names


def cash_type(bx, ctx, settings):
    for ent, fld in ((settings.get('mode_entity'), settings.get('mode_field')), (settings.get('mode_r_entity'), settings.get('mode_r_field'))):
        if ent and fld:
            try:
                v = str(entity_value(bx, ctx, ent, fld) or '').strip()
            except Exception:
                v = ''
            return v or 'не указан'
    return ''


def pick_mode(bx, ctx, settings, mode_param):
    if mode_param in ('A', 'R'):
        return mode_param, 'Указан в запросе'
    a = rule_match(bx, ctx, settings.get('mode_entity'), settings.get('mode_field'), settings.get('mode_value'))
    r = rule_match(bx, ctx, settings.get('mode_r_entity'), settings.get('mode_r_field'), settings.get('mode_r_value'))
    if a is False and r is False:
        return None, f"Тип кассы «{ctx.get('cash_type') or 'не указан'}» не подходит: нужен «{settings.get('mode_value')}» или «{settings.get('mode_r_value')}»"
    if a:
        return 'A', f"Правило «Пэйти»: {settings.get('mode_field')} = {settings.get('mode_value')}"
    if r:
        return 'R', f"Правило «Регистрация в ЛК»: {settings.get('mode_r_field')} = {settings.get('mode_r_value')}"
    if a is False and r is None:
        return 'R', f"Правило «Пэйти» не совпало: {settings.get('mode_field')} ≠ {settings.get('mode_value')}"
    if r is False and a is None:
        return 'A', f"Правило «Регистрация в ЛК» не совпало: {settings.get('mode_r_field')} ≠ {settings.get('mode_r_value')}"
    return settings.get('default_registration_mode') or 'A', 'Режим по умолчанию'


def find_key(obj, names):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in names and v not in (None, '', {}, []):
                return v if not isinstance(v, (dict, list)) else None
        for v in obj.values():
            r = find_key(v, names)
            if r:
                return r
    elif isinstance(obj, list):
        for v in obj:
            r = find_key(v, names)
            if r:
                return r
    return None


def save_attempt(conn, ctx, env, mode, status, values, source, user, http_status=None, code=None, msg=None, req=None, resp_payload=None, ids=None):
    ids = ids or {}
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO payti_registrations
        (connection_key, deal_id, company_id, contact_id, requisite_id, environment, registration_mode, status,
         tax_id, login, firm_id, store_id, registrar_id, http_status, error_code, error_message,
         request_payload_masked, response_payload, source, created_by, registered_at)
        VALUES ('default', %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s, CASE WHEN %s = 'success' THEN NOW() END)""",
        (ctx['deal_id'], str(ctx.get('company_id') or ''), str(ctx.get('contact_id') or ''), str(ctx.get('requisite_id') or ''),
         env, mode, status, values.get('firm.taxId'), values.get('user.login'),
         ids.get('firmId'), ids.get('storeId'), ids.get('registrarId'), http_status, code, msg,
         Json(req) if req is not None else None, Json(resp_payload) if resp_payload is not None else None,
         source, user, status),
    )
    conn.commit()
    cur.close()


def comment(bx, deal_id, text, steps):
    try:
        bx.call('crm.timeline.comment.add', {'fields': {'ENTITY_ID': deal_id, 'ENTITY_TYPE': 'deal', 'COMMENT': text}})
        steps.append({'step': 'Комментарий в CRM', 'ok': True, 'info': ''})
    except Exception as e:
        steps.append({'step': 'Комментарий в CRM', 'ok': False, 'info': str(e)})


def prepare(conn, bx, deal_id, env, mode_param, overrides, steps):
    settings = get_settings(conn)
    ctx = collect(bx, deal_id, steps)
    ctx['password'] = get_password(conn, deal_id)
    ctx['cash_type'] = cash_type(bx, ctx, settings)
    mode, mode_source = pick_mode(bx, ctx, settings, mode_param)
    fields, values = resolve_fields(bx, ctx, settings, overrides)
    steps.append({'step': 'Тип кассы', 'ok': bool(ctx['cash_type']) and ctx['cash_type'] != 'не указан', 'info': ctx['cash_type'] or 'Правило не настроено'})
    steps.append({'step': 'Маппинг', 'ok': mode is not None, 'info': f'Режим {mode} ({mode_source})' if mode else mode_source})
    errors = validate(values, mode) if mode else [f"Тип кассы «{ctx['cash_type'] or 'не указан'}» не подходит для автоматической регистрации"]
    steps.append({'step': 'Проверка', 'ok': not errors, 'info': '; '.join(errors) or 'Всё заполнено'})
    return settings, ctx, mode, mode_source, fields, values, errors


def links(bx, ctx):
    o = bx.origin
    res = {'deal': f"{o}/crm/deal/details/{ctx['deal_id']}/"}
    if ctx.get('company_id'):
        res['company'] = f"{o}/crm/company/details/{ctx['company_id']}/"
    if ctx.get('contact_id'):
        res['contact'] = f"{o}/crm/contact/details/{ctx['contact_id']}/"
    return res


def do_register(conn, bx, deal_id, env, mode_param, overrides, force, source, user):
    steps = []
    result = {'ok': False, 'dealId': deal_id, 'environment': env, 'steps': steps}
    cur = conn.cursor()
    cur.execute(
        "SELECT login, firm_id, store_id FROM payti_registrations WHERE connection_key='default' AND deal_id=%s AND environment=%s AND status='success' ORDER BY id DESC LIMIT 1",
        (str(deal_id), env),
    )
    prev = cur.fetchone()
    cur.close()
    if prev and not force:
        result.update(status='already_registered', login=prev['login'], firmId=prev['firm_id'], mode=None,
                      error='По этой сделке на этом контуре уже есть успешная регистрация')
        return result

    settings, ctx, mode, mode_source, fields, values, errors = prepare(conn, bx, deal_id, env, mode_param, overrides, steps)
    payload = build_payload(values)
    result.update(mode=mode, modeSource=mode_source, cashType=ctx.get('cash_type'), login=values.get('user.login'))

    if mode is None:
        comment(bx, deal_id, f"Екомкасса / Payti\nРегистрация не выполнена: тип кассы «{ctx.get('cash_type') or 'не указан'}» не подходит для автоматической регистрации в Payti.", steps)
        save_attempt(conn, ctx, env, None, 'unsupported_type', values, source, user, code='unsupported_type', msg=errors[0], req=masked(payload))
        result.update(status='unsupported_type', error=errors[0])
        return result

    if errors:
        comment(bx, deal_id, 'Екомкасса / Payti\nРегистрация не выполнена, не заполнены данные:\n- ' + '\n- '.join(errors), steps)
        save_attempt(conn, ctx, env, mode, 'validation_failed', values, source, user, code='validation_failed', msg='; '.join(errors), req=masked(payload))
        result.update(status='validation_failed', error='; '.join(errors))
        return result

    http_status, body, status, err = None, None, 'temporary_error', None
    try:
        r = requests.post(f'{ENVS[env]}/signUp', params={'mode': mode}, json=payload, timeout=10)
        http_status = r.status_code
        try:
            body = r.json()
        except Exception:
            body = {'raw': r.text[:1000]}
        if r.status_code in (200, 201):
            status = 'success'
        elif r.status_code == 400:
            status = 'payti_validation_error'
        elif r.status_code == 409:
            status = 'duplicate'
        err = None if status == 'success' else f'Payti вернул {r.status_code}'
    except Exception as e:
        err = f'Сеть или таймаут: {e}'
    steps.append({'step': 'Запрос в Payti', 'ok': status == 'success', 'info': f'{status} ({http_status})'})

    ids = {}
    if status == 'success':
        ids = {
            'firmId': find_key(body, {'firmId', 'firm_id'}),
            'storeId': find_key(body, {'storeId', 'store_id'}),
            'registrarId': find_key(body, {'registrarId', 'registrar_id'}),
        }
    save_attempt(conn, ctx, env, mode, status, values, source, user, http_status, status if status != 'success' else None, err,
                 masked(payload), body, ids)

    env_label = 'боевой' if env == 'prod' else 'тестовый'
    if status == 'success':
        pw_saved = False
        upd = {}
        if settings.get('result_login_field'):
            upd[settings['result_login_field']] = values['user.login']
        if settings.get('result_password_field'):
            upd[settings['result_password_field']] = values['user.password']
        if settings.get('result_store_field') and ids.get('storeId'):
            upd[settings['result_store_field']] = ids['storeId']
        if upd:
            try:
                bx.call('crm.deal.update', {'id': deal_id, 'fields': upd})
                pw_saved = bool(settings.get('result_password_field'))
            except Exception as e:
                steps.append({'step': 'Запись в сделку', 'ok': False, 'info': str(e)})
        text = (f"Екомкасса / Payti\nКонтур: {env_label}\nEmail: {values['user.login']}\nРежим: {mode}\n"
                f"firmId: {ids.get('firmId')}\nstoreId: {ids.get('storeId')}\nregistrarId: {ids.get('registrarId')}")
        if not pw_saved:
            text += f"\nПароль: {values['user.password']}"
        comment(bx, deal_id, text, steps)
        result.update(ok=True, status='success', firmId=ids.get('firmId'), storeId=ids.get('storeId'),
                      password=values['user.password'], response=body)
    else:
        warn = '\nВнимание: клиент мог частично создаться в Payti, проверьте перед повтором.' if (http_status or 0) >= 500 else ''
        comment(bx, deal_id, f'Екомкасса / Payti\nКонтур: {env_label}\nРегистрация не выполнена: {status}. {err or ""}{warn}', steps)
        result.update(status=status, error=err, response=body)
    return result


def parse_deal_id(params, body_raw, headers):
    for k in ('dealId', 'deal_id', 'DEAL_ID', 'document_id', 'id', 'data[FIELDS][ID]'):
        if params.get(k):
            d = digits(params[k])
            if d:
                return d
    body = body_raw or ''
    if body.strip().startswith('{'):
        try:
            j = json.loads(body)
            for k in ('dealId', 'deal_id', 'DEAL_ID', 'document_id', 'id'):
                if j.get(k):
                    return digits(j[k])
            v = ((j.get('data') or {}).get('FIELDS') or {}).get('ID')
            if v:
                return digits(v)
        except Exception:
            pass
    elif body:
        q = parse_qs(body)
        for k in ('dealId', 'deal_id', 'DEAL_ID', 'document_id[2]', 'document_id', 'id', 'data[FIELDS][ID]'):
            if q.get(k):
                d = digits(q[k][0])
                if d:
                    return d
    return ''


def history_page(conn, params, table, columns, search_cols):
    try:
        limit = min(max(int(params.get('limit') or 50), 1), 100)
        offset = max(int(params.get('offset') or 0), 0)
        days = int(params.get('days') or 0)
    except ValueError:
        limit, offset, days = 50, 0, 0
    where, vals = [], []
    for key in ('status', 'source', 'environment'):
        v = (params.get(key) or '').strip()
        if v and key in columns.split(', '):
            where.append(f'{key} = %s')
            vals.append(v)
    deal = (params.get('deal_id') or '').strip()
    if deal:
        where.append('deal_id = %s')
        vals.append(deal)
    if days > 0:
        where.append("created_at >= NOW() - (%s * INTERVAL '1 day')")
        vals.append(days)
    q = (params.get('q') or '').strip()
    if q:
        like = '%' + q.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_') + '%'
        where.append('(' + ' OR '.join(f'COALESCE({c}::text, \'\') ILIKE %s' for c in search_cols) + ')')
        vals.extend([like] * len(search_cols))
    where_sql = ('WHERE ' + ' AND '.join(where)) if where else ''
    cur = conn.cursor()
    out = {}
    if offset == 0:
        cur.execute(f'SELECT COUNT(*) AS c FROM {table} {where_sql}', vals)
        out['total'] = cur.fetchone()['c']
        cur.execute(f'SELECT DISTINCT status FROM {table} WHERE status IS NOT NULL ORDER BY status')
        out['statuses'] = [r['status'] for r in cur.fetchall()]
        cur.execute(f'SELECT DISTINCT source FROM {table} WHERE source IS NOT NULL ORDER BY source')
        out['sources'] = [r['source'] for r in cur.fetchall()]
    cur.execute(f'SELECT {columns} FROM {table} {where_sql} ORDER BY created_at DESC, id DESC LIMIT {limit + 1} OFFSET {offset}', vals)
    rows = cur.fetchall()
    cur.close()
    out['has_more'] = len(rows) > limit
    out['history'] = rows[:limit]
    return out


def handle(event, action):
    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    headers = {str(k).lower(): v for k, v in (event.get('headers') or {}).items()}
    body_raw = event.get('body') or ''
    if event.get('isBase64Encoded') and body_raw:
        import base64
        body_raw = base64.b64decode(body_raw).decode('utf-8', 'ignore')

    conn = db()
    try:
        if action == 'hook':
            given = params.get('key') or headers.get('x-hook-key') or headers.get('x-api-key') or ''
            if not hook_key_valid(conn, given):
                return resp(401, {'ok': False, 'error': 'Неверный ключ'})
            deal_id = parse_deal_id(params, body_raw, headers)
            if not deal_id:
                return resp(400, {'ok': False, 'error': 'Не указан номер сделки'})
            settings = get_settings(conn)
            env = params.get('env') if params.get('env') in ENVS else (settings.get('default_environment') or 'test')
            mode_param = (params.get('mode') or '').upper()
            result = do_register(conn, Bitrix(), deal_id, env, mode_param, {}, False, 'hook', 'bitrix24')
            return resp(200, {
                'ok': result.get('ok', False), 'status': result.get('status'), 'dealId': deal_id,
                'environment': env, 'mode': result.get('mode'), 'cashType': result.get('cashType'), 'login': result.get('login'),
                'firmId': result.get('firmId'), 'error': result.get('error'),
            })

        api_key = params.get('api_key') or headers.get('x-api-key')
        cur = conn.cursor()
        cur.execute("SELECT id FROM api_keys WHERE api_key = %s AND is_active = true", (api_key or '',))
        if not cur.fetchone():
            return resp(401, {'error': 'Invalid API key'})
        cur.close()

        body = {}
        if body_raw.strip().startswith('{'):
            body = json.loads(body_raw)

        if action == 'meta':
            return resp(200, {
                'fields': [{'path': p, 'label': l} for p, l in FIELDS],
                'entities': ENTITIES, 'taxCodes': TAX_CODES, 'environments': ENVS,
                'bitrixConfigured': bool(os.environ.get('BITRIX_WEBHOOK_URL')),
            })

        if action == 'ping':
            env = params.get('env', 'test')
            if env not in ENVS:
                return resp(400, {'error': 'Неизвестный контур'})
            try:
                r = requests.get(ENVS[env], timeout=6)
                return resp(200, {'ok': r.status_code < 500, 'httpStatus': r.status_code})
            except Exception as e:
                return resp(200, {'ok': False, 'error': str(e)})

        if action == 'settings':
            if method == 'POST':
                s = get_settings(conn)
                cols = ['default_environment', 'default_registration_mode', 'mode_entity', 'mode_field', 'mode_value', 'mode_r_entity', 'mode_r_field', 'mode_r_value',
                        'result_login_field', 'result_password_field', 'result_store_field']
                sets, vals = [], []
                if 'mapping_json' in body:
                    sets.append('mapping_json = %s')
                    vals.append(Json(body['mapping_json']))
                for c in cols:
                    if c in body:
                        sets.append(f'{c} = %s')
                        vals.append(body[c])
                if sets:
                    cur = conn.cursor()
                    cur.execute(f"UPDATE payti_mapping_settings SET {', '.join(sets)}, updated_at = NOW() WHERE connection_key = 'default'", vals)
                    conn.commit()
                    cur.close()
            return resp(200, {'settings': get_settings(conn)})

        if action == 'history':
            return resp(200, history_page(conn, params, 'payti_registrations',
                'id, deal_id, environment, registration_mode, status, login, firm_id, store_id, error_message, source, created_at',
                ['deal_id', 'login', 'firm_id', 'store_id', 'error_message', 'tax_id']))

        bx = Bitrix()
        if not bx.url.startswith('http'):
            return resp(400, {'error': 'Не задан BITRIX_WEBHOOK_URL'})

        if action == 'crm-fields':
            entity = str(params.get('entity', 'deal')).lower()
            if entity not in ENTITIES:
                return resp(400, {'error': 'Неизвестная сущность'})
            meta = bx.fields(entity)
            items = []
            for k, v in meta.items():
                if not isinstance(v, dict):
                    continue
                label = v.get('formLabel') or v.get('listLabel') or v.get('title') or k
                if isinstance(label, dict):
                    label = label.get('ru') or next(iter(label.values()), k)
                enum = [{'id': str(i.get('ID')), 'value': i.get('VALUE')} for i in (v.get('items') or []) if isinstance(i, dict)]
                items.append({'code': k, 'title': str(label), 'type': v.get('type'), 'items': enum})
            items.sort(key=lambda x: (not x['code'].startswith('UF_'), x['title'].lower()))
            return resp(200, {'fields': items})

        deal_id = digits(body.get('dealId') or params.get('dealId'))
        if not deal_id:
            return resp(400, {'error': 'Не указан ID сделки'})
        env = body.get('environment') or params.get('environment') or 'test'
        if env not in ENVS:
            return resp(400, {'error': 'Неизвестный контур'})
        mode_param = (body.get('mode') or '').upper()
        overrides = body.get('overrides') or {}

        if action in ('deal-preview', 'dry-run'):
            steps = []
            try:
                settings, ctx, mode, mode_source, fields, values, errors = prepare(conn, bx, deal_id, env, mode_param, overrides, steps)
            except Exception as e:
                steps.append({'step': 'Ошибка', 'ok': False, 'info': str(e)})
                return resp(200, {'ok': False, 'error': str(e), 'steps': steps})
            for f in fields:
                if f['path'] == 'user.password':
                    f['value'] = '***'
            out = {'ok': not errors, 'dealId': deal_id, 'environment': env, 'mode': mode, 'modeSource': mode_source, 'cashType': ctx.get('cash_type'),
                   'fields': fields, 'errors': errors, 'steps': steps, 'links': links(bx, ctx)}
            if action == 'dry-run':
                out['request'] = masked(build_payload(values))
            return resp(200, out)

        if action == 'register':
            try:
                result = do_register(conn, bx, deal_id, env, mode_param, overrides, bool(body.get('force')), 'console', 'console')
            except Exception as e:
                return resp(200, {'ok': False, 'status': 'error', 'error': str(e)})
            return resp(200, result)

        return resp(400, {'error': 'Unknown action'})
    finally:
        conn.close()