import base64
import json
import os
import secrets
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

import boto3
import psycopg2
from psycopg2.extras import Json

import time as _time

import exchange
from payti import Bitrix, db, digits, hook_key_valid, parse_deal_id, resp

ACTIONS = {
    'slots-hook', 'slots-preview', 'slots-meta', 'slots-stages', 'slots-users', 'slots-settings', 'slots-service-save',
    'slots-service-delete', 'slots-bookings', 'slots-deals', 'slots-invite', 'slots-busy-check',
    'slots-cancel', 'slots-resend', 'slots-exchange', 'slots-logo', 'slots-webhook-test', 'slots-public-get', 'slots-public-slots', 'slots-public-book',
}
PUBLIC = {'slots-public-get', 'slots-public-slots', 'slots-public-book'}
SETTINGS_COLS = [
    'title', 'logo_url', 'base_url', 'timezone', 'step_min', 'horizon_days', 'min_notice_hours',
    'reschedule_deadline_hours', 'max_per_day', 'link_days', 'source_category_id', 'source_stage_id',
    'classifier_field', 'link_field', 'start_field', 'target_stage_id', 'create_task', 'task_title',
    'create_calendar_event', 'check_bitrix_busy', 'check_bitrix_tasks', 'department_id', 'assigner_mode', 'assigner_user_id', 'bitrix_webhook_url', 'employee_mode', 'task_description',
]
INT_COLS = {'step_min', 'horizon_days', 'min_notice_hours', 'reschedule_deadline_hours', 'max_per_day', 'link_days'}
BOOL_COLS = {'create_task', 'create_calendar_event', 'check_bitrix_busy', 'check_bitrix_tasks'}
UTC = timezone.utc


def utcnow():
    return datetime.now(UTC).replace(tzinfo=None)


def iso_z(dt):
    return dt.isoformat() + 'Z'


def parse_iso(s):
    d = datetime.fromisoformat(str(s).replace('Z', '+00:00'))
    if d.tzinfo:
        d = d.astimezone(UTC).replace(tzinfo=None)
    return d


def to_local(dt, tz):
    return dt.replace(tzinfo=UTC).astimezone(tz)


def get_settings(conn):
    cur = conn.cursor()
    cur.execute('SELECT * FROM slot_settings WHERE id = 1')
    row = cur.fetchone()
    if not row:
        cur.execute('INSERT INTO slot_settings (id) VALUES (1) ON CONFLICT DO NOTHING')
        conn.commit()
        cur.execute('SELECT * FROM slot_settings WHERE id = 1')
        row = cur.fetchone()
    if not row.get('base_url'):
        cur.execute('SELECT sign_base_url FROM fns_settings LIMIT 1')
        f = cur.fetchone()
        row['base_url'] = (f or {}).get('sign_base_url') or ''
    cur.close()
    return row


def make_bx(conn):
    bx = exchange.SlotBitrix()
    cur = conn.cursor()
    cur.execute('SELECT bitrix_webhook_url FROM slot_settings WHERE id = 1')
    row = cur.fetchone()
    cur.close()
    url = ((row or {}).get('bitrix_webhook_url') or '').strip()
    if url:
        bx.url = url.rstrip('/') + '/'
    return bx


def public_settings(settings):
    out = dict(settings)
    url = out.pop('bitrix_webhook_url', None) or ''
    out['webhook_set'] = bool(url)
    out['webhook_hint'] = (url[:url.find('/rest/')] + '/rest/…' + url.rstrip('/')[-4:]) if '/rest/' in url else ('…' + url[-4:] if url else '')
    return out


def get_services(conn):
    cur = conn.cursor()
    cur.execute('SELECT * FROM slot_services ORDER BY is_default DESC, id')
    rows = cur.fetchall()
    cur.close()
    return rows


def add_event(conn, bid, step, ok, info=''):
    cur = conn.cursor()
    cur.execute('INSERT INTO slot_events (booking_id, step, ok, info) VALUES (%s,%s,%s,%s)', (bid, step, ok, str(info)[:1000]))
    conn.commit()
    cur.close()


def link_for(settings, token):
    return f"{(settings.get('base_url') or '').rstrip('/')}/book/{token}"


def match_service(bx, settings, deal, services):
    code = settings.get('classifier_field')
    vals = []
    if code:
        raw = deal.get(code)
        for r in raw if isinstance(raw, list) else [raw]:
            if r in (None, '', '0'):
                continue
            vals.append(str(r).strip().lower())
            name = bx.enum_name('deal', code, r)
            if name is not None:
                vals.append(str(name).strip().lower())
    active = [s for s in services if s['is_active']]
    for s in active:
        mv = [m.strip().lower() for m in s['match_values']]
        if any(v in mv for v in vals):
            return s
    for s in active:
        if s['is_default']:
            return s
    return None


def parse_bx_dt(s, tzname, default_tz):
    if not s:
        return None
    dt = None
    for f in ('%d.%m.%Y %H:%M:%S', '%d.%m.%Y %H:%M', '%Y-%m-%d %H:%M:%S', '%d.%m.%Y'):
        try:
            dt = datetime.strptime(str(s), f)
            break
        except ValueError:
            continue
    if dt is None:
        try:
            dt = datetime.fromisoformat(str(s))
        except ValueError:
            return None
        if dt.tzinfo:
            return dt.astimezone(UTC).replace(tzinfo=None)
    try:
        z = ZoneInfo(tzname) if tzname else default_tz
    except Exception:
        z = default_tz
    return dt.replace(tzinfo=z).astimezone(UTC).replace(tzinfo=None)


def bitrix_busy(bx, user_ids, d_from, d_to, tz):
    out = {str(u): [] for u in user_ids}
    if not user_ids:
        return out, None
    try:
        data = bx.call('calendar.accessibility.get', {
            'users': [int(u) for u in user_ids], 'from': d_from.strftime('%Y-%m-%d'), 'to': d_to.strftime('%Y-%m-%d'),
        })
    except Exception as e:
        return out, str(e)
    for uid, items in (data or {}).items():
        for it in items or []:
            if str(it.get('ACCESSIBILITY') or 'busy').lower() == 'free':
                continue
            a = parse_bx_dt(it.get('DATE_FROM'), it.get('TZ_FROM'), tz)
            b = parse_bx_dt(it.get('DATE_TO'), it.get('TZ_TO'), tz)
            if not a or not b:
                continue
            if it.get('DT_SKIP_TIME') == 'Y':
                b += timedelta(days=1)
            out.setdefault(str(uid), []).append((a, b))
    return out, None


def bitrix_task_busy(bx, user_ids, lo, hi, tz, skip_task_id=None):
    out = {str(u): [] for u in user_ids}
    if not user_ids:
        return out, None
    try:
        start = 0
        for _ in range(6):
            r = requests_post(bx, 'tasks.task.list', {
                'filter': {'RESPONSIBLE_ID': [int(u) for u in user_ids], 'REAL_STATUS': [1, 2, 3, 6],
                           '<=START_DATE_PLAN': hi.strftime('%Y-%m-%d 00:00:00'), '>=END_DATE_PLAN': lo.strftime('%Y-%m-%d 00:00:00')},
                'select': ['ID', 'RESPONSIBLE_ID', 'START_DATE_PLAN', 'END_DATE_PLAN'], 'start': start,
            })
            res = r.get('result') or {}
            tasks = res.get('tasks') if isinstance(res, dict) else res
            for t in tasks or []:
                if skip_task_id and str(t.get('id')) == str(skip_task_id):
                    continue
                a = parse_bx_dt(t.get('startDatePlan'), None, tz)
                b = parse_bx_dt(t.get('endDatePlan'), None, tz)
                if a and b and b > a:
                    out.setdefault(str(t.get('responsibleId')), []).append((a, b))
            if r.get('next') is None:
                break
            start = r['next']
    except Exception as e:
        return out, str(e)
    return out, None


def local_busy(conn, d_from, d_to, exclude_id=None):
    cur = conn.cursor()
    cur.execute(
        "SELECT id, employee_id, start_at, end_at FROM slot_bookings WHERE status = 'booked' AND end_at > %s AND start_at < %s AND id <> %s",
        (d_from, d_to, exclude_id or 0),
    )
    rows = cur.fetchall()
    cur.close()
    return rows


def compute_slots(conn, bx, settings, service, d_from, d_to, booking=None):
    tz = ZoneInfo(settings['timezone'])
    emps = [str(e['id']) for e in (settings.get('employees') or [])]
    if settings.get('employee_mode') == 'deal' and booking:
        try:
            deal = bx.call('crm.deal.get', {'id': booking['deal_id']}) or {}
            resp_id = str(deal.get('ASSIGNED_BY_ID') or '')
            if resp_id:
                emps = [resp_id]
        except Exception:
            pass
    now = utcnow()
    earliest = now + timedelta(hours=settings['min_notice_hours'])
    today = to_local(now, tz).date()
    d_from = max(d_from, today)
    d_to = min(d_to, today + timedelta(days=settings['horizon_days']))
    warn = None
    if not emps or d_to < d_from:
        return [], warn
    lo = datetime.combine(d_from - timedelta(days=1), time(0, 0))
    hi = datetime.combine(d_to + timedelta(days=2), time(0, 0))
    busy = {e: [] for e in emps}
    if settings['check_bitrix_busy']:
        bb, warn = bitrix_busy(bx, emps, d_from - timedelta(days=1), d_to + timedelta(days=1), tz)
        own = None
        if booking and booking.get('start_at'):
            own = (str(booking.get('employee_id')), booking['start_at'], booking['end_at'])
        for e, items in bb.items():
            for a, b in items:
                if own and e == own[0] and a == own[1] and b == own[2]:
                    continue
                busy.setdefault(e, []).append((a, b))
    if settings.get('check_bitrix_tasks'):
        tb, w2 = bitrix_task_busy(bx, emps, datetime.combine(d_from - timedelta(days=1), time(0, 0)), hi, tz, (booking or {}).get('task_id'))
        warn = warn or w2
        for e, items in tb.items():
            busy.setdefault(e, []).extend(items)
    per_day = {}
    for r in local_busy(conn, lo, hi, (booking or {}).get('id')):
        busy.setdefault(str(r['employee_id']), []).append((r['start_at'], r['end_at']))
        d = to_local(r['start_at'], tz).date()
        per_day[d] = per_day.get(d, 0) + 1
    dur = timedelta(minutes=service['duration_min'])
    buf = timedelta(minutes=service['buffer_min'])
    step = timedelta(minutes=max(settings['step_min'], 5))
    fh, fm = [int(x) for x in service['work_from'].split(':')]
    th, tm = [int(x) for x in service['work_to'].split(':')]
    slots = []
    d = d_from
    while d <= d_to:
        if d.isoweekday() in service['work_days'] and not (settings['max_per_day'] and per_day.get(d, 0) >= settings['max_per_day']):
            cur = datetime.combine(d, time(fh, fm), tzinfo=tz)
            wend = datetime.combine(d, time(th, tm), tzinfo=tz)
            while cur + dur <= wend:
                s = cur.astimezone(UTC).replace(tzinfo=None)
                if s >= earliest:
                    e_end = s + dur + buf
                    free = [e for e in emps if not any(a < e_end and b > s for a, b in busy.get(e, []))]
                    if free:
                        slots.append((s, free))
                cur += step
        d += timedelta(days=1)
    return slots, warn


def get_booking(conn, token):
    cur = conn.cursor()
    cur.execute('SELECT * FROM slot_bookings WHERE token = %s', (token,))
    row = cur.fetchone()
    cur.close()
    return row


def get_service(conn, sid):
    cur = conn.cursor()
    cur.execute('SELECT * FROM slot_services WHERE id = %s', (sid,))
    row = cur.fetchone()
    cur.close()
    return row


def emp_name(settings, emp_id):
    for e in settings.get('employees') or []:
        if str(e['id']) == str(emp_id):
            return e.get('name') or str(emp_id)
    return str(emp_id)


def clean_fields(raw):
    out = []
    for i, f in enumerate(raw or []):
        label = str((f or {}).get('label') or '').strip()
        if label:
            out.append({'id': str((f or {}).get('id') or f'f{i + 1}')[:40], 'label': label[:200], 'hint': str((f or {}).get('hint') or '').strip()[:500],
                    'crm_field': str((f or {}).get('crm_field') or '').strip()[:100]})
    return out


def booking_view(settings, b, service):
    tz = ZoneInfo(settings['timezone'])
    now = utcnow()
    booked = b['status'] == 'booked'
    expired = b['status'] == 'invited' and b['expires_at'] < now
    can_re = booked and b['start_at'] - now >= timedelta(hours=settings['reschedule_deadline_hours'])
    return {
        'ok': True, 'status': b['status'], 'expired': expired, 'title': settings['title'], 'logo': settings.get('logo_url') or '',
        'timezone': settings['timezone'], 'tzOffset': to_local(now, tz).strftime('%z'),
        'service': (service or {}).get('name') or '', 'durationMin': (service or {}).get('duration_min') or 0,
        'start': iso_z(b['start_at']) if b.get('start_at') else None, 'end': iso_z(b['end_at']) if b.get('end_at') else None,
        'employee': b.get('employee_name') or '', 'canReschedule': can_re,
        'rescheduleHours': settings['reschedule_deadline_hours'], 'horizonDays': settings['horizon_days'],
        'dealTitle': b.get('deal_title') or '', 'reschedules': b.get('reschedule_count') or 0,
        'fields': [{k: v for k, v in f.items() if k != 'crm_field'} for f in clean_fields((service or {}).get('extra_fields'))], 'answers': b.get('answers') or {},
    }


def fmt_local(dt, tz):
    return to_local(dt, tz).strftime('%d.%m.%Y %H:%M')


def field_text(bx, entity, code, meta, value, tz):
    if value is None or value == '' or value == [] or value == '0' and meta.get('type') == 'boolean':
        return ''
    typ = meta.get('type')
    vals = value if isinstance(value, list) else [value]
    out = []
    for v in vals:
        if typ == 'enumeration':
            v = bx.enum_name(entity, code, v)
        elif typ == 'boolean':
            v = 'Да' if str(v) in ('1', 'Y', 'true', 'True') else 'Нет'
        elif typ in ('datetime', 'date'):
            try:
                dt = datetime.fromisoformat(str(v))
                v = (dt.astimezone(tz) if dt.tzinfo else dt).strftime('%d.%m.%Y %H:%M' if typ == 'datetime' else '%d.%m.%Y')
            except Exception:
                pass
        elif isinstance(v, dict):
            v = v.get('VALUE') or v.get('value') or ''
        out.append(str(v))
    return ', '.join(x for x in out if x)


def field_label(f, code):
    label = f.get('formLabel') or f.get('listLabel') or f.get('title') or code
    if isinstance(label, dict):
        label = label.get('ru') or next(iter(label.values()), code)
    return str(label).strip().lower()


def render_template(bx, text, deal, tz, start_field, ls, service, deal_id):
    import re
    if not text:
        return ''
    cache = {}

    def titles(entity):
        if entity not in cache:
            m = {}
            for code, f in bx.fields(entity).items():
                if isinstance(f, dict):
                    m.setdefault(field_label(f, code), code)
            cache[entity] = m
        return cache[entity]

    def related(kind):
        key = 'rel_' + kind
        if key in cache:
            return cache[key]
        data = {}
        try:
            if kind == 'company' and deal.get('COMPANY_ID') and str(deal['COMPANY_ID']) != '0':
                data = bx.call('crm.company.get', {'id': deal['COMPANY_ID']}) or {}
            elif kind == 'contact':
                items = bx.call('crm.deal.contact.items.get', {'id': deal_id}) or []
                if items:
                    primary = [i for i in items if i.get('IS_PRIMARY') == 'Y']
                    data = bx.call('crm.contact.get', {'id': (primary or items)[0].get('CONTACT_ID')}) or {}
        except Exception:
            data = {}
        cache[key] = data
        return data

    def inn():
        if 'inn' in cache:
            return cache['inn']
        v = ''
        try:
            cid = deal.get('COMPANY_ID')
            if cid and str(cid) != '0':
                r = bx.call('crm.requisite.list', {'filter': {'ENTITY_TYPE_ID': 4, 'ENTITY_ID': cid}, 'select': ['RQ_INN']}) or []
                v = next((x.get('RQ_INN') for x in r if x.get('RQ_INN')), '') or ''
            if not v:
                link = bx.call('crm.requisite.link.get', {'entityTypeId': 2, 'entityId': deal_id}) or {}
                if link.get('REQUISITE_ID'):
                    v = (bx.call('crm.requisite.get', {'id': link['REQUISITE_ID']}) or {}).get('RQ_INN') or ''
        except Exception:
            v = ''
        cache['inn'] = v
        return v

    def one(m):
        raw = m.group(1).strip()
        key = raw.lower()
        if key in ('deal', 'номер сделки'):
            return str(deal_id)
        if key in ('service', 'услуга'):
            return service['name']
        if key in ('название сделки', 'название', 'deal_title'):
            return str(deal.get('TITLE') or '')
        if key in ('дата и время записи', 'дата записи'):
            return ls.strftime('%d.%m.%Y %H:%M')
        if key in ('компания: инн', 'инн компании', 'инн'):
            return str(inn())
        entity, src, label = 'deal', deal, key
        if ':' in key and key.split(':', 1)[0].strip() in ('компания', 'контакт'):
            pre, label = [x.strip() for x in key.split(':', 1)]
            entity = 'company' if pre == 'компания' else 'contact'
            src = related(entity)
        code = titles(entity).get(label)
        if not code:
            return m.group(0)
        if entity == 'deal' and start_field and code == start_field:
            return ls.strftime('%d.%m.%Y %H:%M')
        meta = bx.fields(entity).get(code) or {}
        v = src.get(code)
        if entity == 'deal' and (v is None or v == ''):
            v = deal.get(code)
        return field_text(bx, entity, code, meta, v, tz)

    return re.sub(r'\{([^{}]+)\}', one, text)


def answers_block(service, b):
    ans = b.get('answers') or {}
    lines = [f"{f['label']}: {ans.get(f['id'], '')}" for f in clean_fields((service or {}).get('extra_fields')) if ans.get(f['id'])]
    return ('\n\nДополнительная информация от клиента\n' + '\n'.join(lines)) if lines else ''


def crm_after_booking(conn, bx, settings, service, b, emp_id, start, end, was_booked, only=None):
    import time
    t0 = time.time()
    add_event(conn, b['id'], 'Начало создания задачи и события', True, '')
    try:
        crm_after_booking_run(conn, bx, settings, service, b, emp_id, start, end, was_booked, only)
    except Exception as e:
        try:
            conn.rollback()
            add_event(conn, b['id'], 'Сбой после записи', False, f'{type(e).__name__}: {e}')
        except Exception:
            pass
        return
    add_event(conn, b['id'], 'Задача и событие обработаны', True, f'{time.time() - t0:.1f} с')


def crm_after_booking_run(conn, bx, settings, service, b, emp_id, start, end, was_booked, only=None):
    bid = b['id']
    tz = ZoneInfo(settings['timezone'])
    ls, le = to_local(start, tz), to_local(end, tz)
    name = emp_name(settings, emp_id)
    updates = {}
    if settings.get('start_field'):
        updates[settings['start_field']] = ls.isoformat()
    if settings.get('target_stage_id'):
        updates['STAGE_ID'] = settings['target_stage_id']
    for f in clean_fields((service or {}).get('extra_fields')):
        val = (b.get('answers') or {}).get(f['id'])
        if f.get('crm_field') and val:
            updates[f['crm_field']] = val
    deal = {}
    try:
        deal = bx.call('crm.deal.get', {'id': b['deal_id']}) or {}
    except Exception as e:
        add_event(conn, bid, 'Чтение сделки', False, e)
    if updates and not only:
        try:
            bx.call('crm.deal.update', {'id': b['deal_id'], 'fields': updates})
            add_event(conn, bid, 'Обновление сделки', True, ', '.join(updates.keys()))
        except Exception as e:
            add_event(conn, bid, 'Обновление сделки', False, e)
    task_id = b.get('task_id')
    if settings['create_task'] and (not only or 'task' in only):
        creator = deal.get('ASSIGNED_BY_ID') if settings['assigner_mode'] == 'deal' else settings.get('assigner_user_id')
        try:
            if task_id and was_booked:
                note = f"Клиент перенёс запись по своей инициативе. Новое время: {fmt_local(start, tz)}, специалист {name}. Эта задача отменена, создана новая."
                try:
                    bx.call('task.commentitem.add', {'TASKID': int(task_id), 'FIELDS': {'POST_MESSAGE': note}})
                    add_event(conn, bid, 'Комментарий в старой задаче', True, f'№{task_id}')
                except Exception as e:
                    add_event(conn, bid, 'Комментарий в старой задаче', False, e)
                try:
                    old = (bx.call('tasks.task.get', {'taskId': task_id, 'select': ['TITLE']}) or {}).get('task') or {}
                    bx.call('tasks.task.update', {'taskId': task_id, 'fields': {'TITLE': '[Отменено: перенос клиентом] ' + str(old.get('title') or '')}})
                except Exception:
                    pass
                try:
                    bx.call('tasks.task.complete', {'taskId': task_id})
                    add_event(conn, bid, 'Старая задача закрыта', True, f'№{task_id}')
                except Exception as e:
                    add_event(conn, bid, 'Старая задача закрыта', False, e)
                task_id = None
            if True:
                title = render_template(bx, settings['task_title'], deal, tz, settings.get('start_field'), ls, service, b['deal_id'])
                fields = {
                    'TITLE': title, 'RESPONSIBLE_ID': int(emp_id), 'UF_CRM_TASK': ['D_' + str(b['deal_id'])],
                    'START_DATE_PLAN': ls.isoformat(), 'END_DATE_PLAN': le.isoformat(), 'DEADLINE': le.isoformat(),
                    'DESCRIPTION': (render_template(bx, settings.get('task_description'), deal, tz, settings.get('start_field'), ls, service, b['deal_id'])
                                    or f"Клиент записался на {fmt_local(start, tz)}. Сделка №{b['deal_id']} {b.get('deal_title') or ''}") + answers_block(service, b),
                }
                if creator:
                    fields['CREATED_BY'] = int(creator)
                r = bx.call('tasks.task.add', {'fields': fields}) or {}
                task_id = str((r.get('task') or {}).get('id') or '')
                add_event(conn, bid, 'Задача создана', bool(task_id), f'№{task_id}')
        except Exception as e:
            add_event(conn, bid, 'Задача', False, e)
    event_id = b.get('event_id')
    if settings['create_calendar_event'] and (not only or 'event' in only):
        try:
            if event_id:
                try:
                    bx.call('calendar.event.update', {'id': event_id, 'type': 'user', 'ownerId': int(b['employee_id']),
                                                      'description': f"Клиент перенёс запись по своей инициативе на {fmt_local(start, tz)}. Событие отменено."})
                except Exception:
                    pass
                try:
                    bx.call('calendar.event.delete', {'id': event_id})
                    add_event(conn, bid, 'Старое событие удалено', True, f'№{event_id}')
                    event_id = None
                except Exception as e:
                    add_event(conn, bid, 'Старое событие удалено', False, e)
            r = bx.call('calendar.event.add', {
                'type': 'user', 'ownerId': int(emp_id), 'from': ls.strftime('%Y-%m-%d %H:%M:%S'), 'to': le.strftime('%Y-%m-%d %H:%M:%S'),
                'timezone_from': settings['timezone'], 'timezone_to': settings['timezone'], 'name': f"{service['name']} · сделка {b['deal_id']}",
                'description': b.get('deal_title') or '', 'accessibility': 'busy', 'is_meeting': 'N',
            })
            event_id = str(r) if r else ''
            add_event(conn, bid, 'Событие в календаре', bool(event_id), f'№{event_id}')
        except Exception as e:
            add_event(conn, bid, 'Событие в календаре', False, e)
    cur = conn.cursor()
    cur.execute('UPDATE slot_bookings SET task_id = %s, event_id = %s WHERE id = %s', (task_id or None, event_id or None, bid))
    conn.commit()
    cur.close()
    if only:
        return
    try:
        text = ('Клиент перенёс запись на настройку' if was_booked else 'Клиент записался на настройку') + \
            f": {fmt_local(start, tz)}, специалист {name}" + answers_block(service, b)
        bx.call('crm.timeline.comment.add', {'fields': {'ENTITY_ID': int(b['deal_id']), 'ENTITY_TYPE': 'deal', 'COMMENT': text}})
    except Exception as e:
        add_event(conn, bid, 'Комментарий в сделке', False, e)


def do_book(conn, bx, token, start_iso, answers_in=None):
    b = get_booking(conn, token)
    if not b:
        return 404, {'ok': False, 'error': 'Ссылка не найдена'}
    if b['status'] == 'cancelled' or (b['status'] == 'invited' and b['expires_at'] < utcnow()):
        return 410, {'ok': False, 'error': 'Ссылка больше не действует'}
    settings = get_settings(conn)
    service = get_service(conn, b['service_id'])
    was_booked = b['status'] == 'booked'
    if was_booked and b['start_at'] - utcnow() < timedelta(hours=settings['reschedule_deadline_hours']):
        return 409, {'ok': False, 'error': f"Перенос возможен не позднее чем за {settings['reschedule_deadline_hours']} ч до начала"}
    try:
        start = parse_iso(start_iso)
    except Exception:
        return 400, {'ok': False, 'error': 'Некорректное время'}
    fields = clean_fields((service or {}).get('extra_fields'))
    answers = dict(b.get('answers') or {})
    if isinstance(answers_in, dict):
        for f in fields:
            if f['id'] in answers_in:
                answers[f['id']] = str(answers_in[f['id']] or '').strip()[:2000]
    answers = {f['id']: answers.get(f['id'], '') for f in fields}
    missing = [f['label'] for f in fields if not answers.get(f['id'])]
    if missing:
        return 400, {'ok': False, 'error': 'Заполните все поля: ' + ', '.join(missing), 'missing': True}
    b['answers'] = answers
    tz = ZoneInfo(settings['timezone'])
    day = to_local(start, tz).date()
    cur = conn.cursor()
    slots, _ = compute_slots(conn, bx, settings, service, day, day, b)
    free = next((f for s, f in slots if s == start), None)
    if not free:
        conn.rollback()
        return 409, {'ok': False, 'error': 'Это время уже занято. Выберите другое', 'taken': True}
    cur.execute(
        "SELECT employee_id, count(*) AS c FROM slot_bookings WHERE status = 'booked' AND start_at >= %s AND start_at < %s GROUP BY employee_id",
        (start - timedelta(days=7), start + timedelta(days=7)),
    )
    load = {r['employee_id']: r['c'] for r in cur.fetchall()}
    order = {str(e['id']): i for i, e in enumerate(settings.get('employees') or [])}
    emp = sorted(free, key=lambda e: (load.get(e, 0), order.get(e, 999)))[0]
    end = start + timedelta(minutes=service['duration_min'])
    try:
        cur.execute(
            "UPDATE slot_bookings SET status = 'booked', employee_id = %s, employee_name = %s, start_at = %s, end_at = %s, "
            "reschedule_count = reschedule_count + %s, answers = %s, updated_at = NOW() WHERE id = %s",
            (emp, emp_name(settings, emp), start, end, 1 if was_booked else 0, Json(answers), b['id']),
        )
        cur.execute(
            "SELECT 1 FROM slot_bookings WHERE status = 'booked' AND employee_id = %s AND id <> %s AND start_at < %s AND end_at > %s LIMIT 1",
            (emp, b['id'], end, start),
        )
        if cur.fetchone():
            conn.rollback()
            return 409, {'ok': False, 'error': 'Это время уже занято. Выберите другое', 'taken': True}
        conn.commit()
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        return 409, {'ok': False, 'error': 'Это время уже занято. Выберите другое', 'taken': True}
    cur.close()
    add_event(conn, b['id'], 'Перенос времени' if was_booked else 'Запись клиента', True, f"{fmt_local(start, tz)} · {emp_name(settings, emp)}")
    crm_after_booking(conn, bx, settings, service, b, emp, start, end, was_booked)
    return 200, booking_view(settings, get_booking(conn, token), service)


def invite(conn, bx, deal_id, source):
    settings = get_settings(conn)
    services = get_services(conn)
    deal = bx.call('crm.deal.get', {'id': deal_id}) or {}
    if not deal:
        return {'ok': False, 'error': 'Сделка не найдена'}
    service = match_service(bx, settings, deal, services)
    if not service:
        return {'ok': False, 'error': 'Не удалось подобрать услугу: нет совпадения с классификатором и не задана услуга по умолчанию'}
    cur = conn.cursor()
    cur.execute(
        "SELECT * FROM slot_bookings WHERE deal_id = %s AND (status = 'booked' OR (status = 'invited' AND expires_at > NOW())) ORDER BY id DESC LIMIT 1",
        (deal_id,),
    )
    ex = cur.fetchone()
    if ex:
        if ex['status'] == 'invited' and ex['service_id'] != service['id']:
            cur.execute('UPDATE slot_bookings SET service_id = %s, updated_at = NOW() WHERE id = %s', (service['id'], ex['id']))
            conn.commit()
        cur.close()
        return {'ok': True, 'status': ex['status'], 'bookingId': ex['id'], 'link': link_for(settings, ex['token']), 'service': service['name'], 'reused': True}
    token = secrets.token_urlsafe(24)
    cur.execute(
        "INSERT INTO slot_bookings (token, deal_id, deal_title, service_id, status, expires_at) VALUES (%s,%s,%s,%s,'invited', NOW() + (%s * INTERVAL '1 day')) RETURNING id",
        (token, deal_id, deal.get('TITLE') or '', service['id'], settings['link_days']),
    )
    bid = cur.fetchone()['id']
    conn.commit()
    cur.close()
    link = link_for(settings, token)
    add_event(conn, bid, 'Ссылка создана', True, f"{source} · {service['name']}")
    if settings.get('link_field'):
        try:
            bx.call('crm.deal.update', {'id': deal_id, 'fields': {settings['link_field']: link}})
            add_event(conn, bid, 'Ссылка записана в сделку', True, settings['link_field'])
        except Exception as e:
            add_event(conn, bid, 'Ссылка записана в сделку', False, e)
    try:
        bx.call('crm.timeline.comment.add', {'fields': {
            'ENTITY_ID': int(deal_id), 'ENTITY_TYPE': 'deal',
            'COMMENT': f"Ссылка для выбора времени настройки ({service['name']}, {service['duration_min']} мин): {link}"}})
    except Exception as e:
        add_event(conn, bid, 'Комментарий в сделке', False, e)
    return {'ok': True, 'status': 'invited', 'bookingId': bid, 'link': link, 'service': service['name'], 'reused': False}


def list_users(bx, department='', q=''):
    flt = {'ACTIVE': True}
    if department:
        flt['UF_DEPARTMENT'] = int(department)
    out, start = [], 0
    for _ in range(4):
        r = requests_post(bx, 'user.get', {'FILTER': flt, 'start': start})
        out.extend(r.get('result') or [])
        if r.get('next') is None:
            break
        start = r['next']
    users = [{'id': str(u['ID']), 'name': f"{u.get('NAME', '')} {u.get('LAST_NAME', '')}".strip() or str(u['ID']), 'position': u.get('WORK_POSITION') or ''} for u in out]
    if q:
        users = [u for u in users if q.lower() in u['name'].lower()]
    return users


def requests_post(bx, method, params):
    import requests
    t = _time.time()
    r = requests.post(bx.url + method + '.json', json=params, timeout=8)
    d = r.json()
    ms = int((_time.time() - t) * 1000)
    if 'error' in d:
        exchange.add_call(method, params, d.get('error_description') or d['error'], False, ms)
        raise RuntimeError(f"{method}: {d.get('error_description') or d['error']}")
    exchange.add_call(method, params, d.get('result'), True, ms)
    return d


def handle(event, action):
    if action not in exchange.KINDS:
        return handle_inner(event, action)
    started = _time.time()
    exchange.reset()
    result = handle_inner(event, action)
    exchange.finish(event, action, result, started)
    return result


def handle_inner(event, action):
    params = event.get('queryStringParameters') or {}
    headers = {str(k).lower(): v for k, v in (event.get('headers') or {}).items()}
    body_raw = event.get('body') or ''
    if event.get('isBase64Encoded') and body_raw:
        body_raw = base64.b64decode(body_raw).decode('utf-8', 'ignore')
    body = {}
    if body_raw.strip().startswith('{'):
        body = json.loads(body_raw)
    conn = db()
    try:
        if action == 'slots-hook':
            if not hook_key_valid(conn, params.get('key') or headers.get('x-hook-key') or headers.get('x-api-key') or ''):
                return resp(401, {'ok': False, 'error': 'Неверный ключ'})
            deal_id = parse_deal_id(params, body_raw, headers)
            if not deal_id:
                return resp(400, {'ok': False, 'error': 'Не указан номер сделки'})
            r = invite(conn, make_bx(conn), deal_id, 'hook')
            return resp(200 if r.get('ok') else 400, {**r, 'dealId': deal_id})

        if action in PUBLIC:
            token = params.get('token', '')
            b = get_booking(conn, token) if token else None
            if not b:
                return resp(404, {'ok': False, 'error': 'Ссылка не найдена'})
            settings = get_settings(conn)
            service = get_service(conn, b['service_id'])
            if action == 'slots-public-get':
                return resp(200, booking_view(settings, b, service))
            if b['status'] == 'cancelled' or (b['status'] == 'invited' and b['expires_at'] < utcnow()):
                return resp(410, {'ok': False, 'error': 'Ссылка больше не действует'})
            if action == 'slots-public-slots':
                tz = ZoneInfo(settings['timezone'])
                today = to_local(utcnow(), tz).date()
                try:
                    d_from = date.fromisoformat(params.get('from') or '') if params.get('from') else today
                    d_to = date.fromisoformat(params.get('to') or '') if params.get('to') else today + timedelta(days=settings['horizon_days'])
                except ValueError:
                    return resp(400, {'ok': False, 'error': 'Некорректная дата'})
                d_to = min(d_to, d_from + timedelta(days=31))
                slots, warn = compute_slots(conn, make_bx(conn), settings, service, d_from, d_to, b)
                return resp(200, {'ok': True, 'timezone': settings['timezone'], 'slots': [iso_z(s) for s, _ in slots], 'warning': bool(warn)})
            code, data = do_book(conn, make_bx(conn), token, body.get('start'), body.get('answers'))
            return resp(code, data)

        api_key = params.get('api_key') or headers.get('x-api-key') or ''
        cur = conn.cursor()
        cur.execute('SELECT id FROM api_keys WHERE api_key = %s AND is_active = true', (api_key,))
        if not cur.fetchone():
            cur.close()
            return resp(401, {'error': 'Invalid API key'})

        if action == 'slots-settings':
            sets, vals = [], []
            for c in SETTINGS_COLS:
                if c in body:
                    v = body[c]
                    if c in INT_COLS:
                        v = max(int(v or 0), 0)
                    elif c in BOOL_COLS:
                        v = bool(v)
                    elif v == '':
                        v = None
                    if c == 'bitrix_webhook_url' and v:
                        v = str(v).strip()
                        if not v.startswith('https://') or '/rest/' not in v:
                            return resp(400, {'error': 'Вебхук должен быть вида https://домен.bitrix24.ru/rest/1/токен/'})
                    sets.append(f'{c} = %s')
                    vals.append(v)
            if 'employees' in body:
                sets.append('employees = %s')
                vals.append(Json([{'id': str(e['id']), 'name': str(e.get('name') or '')} for e in body['employees']]))
            if sets:
                cur.execute(f"UPDATE slot_settings SET {', '.join(sets)}, updated_at = NOW() WHERE id = 1", vals)
                conn.commit()
            return resp(200, {'settings': public_settings(get_settings(conn))})

        if action == 'slots-service-save':
            wd = sorted({int(x) for x in body.get('work_days', [1, 2, 3, 4, 5]) if 1 <= int(x) <= 7})
            mv = [str(x).strip() for x in body.get('match_values', []) if str(x).strip()]
            vals = (str(body.get('name') or 'Услуга')[:200], mv, max(int(body.get('duration_min') or 60), 5), max(int(body.get('buffer_min') or 0), 0),
                    wd, body.get('work_from') or '09:00', body.get('work_to') or '18:00', bool(body.get('is_default')), body.get('is_active', True) is not False,
                    Json(clean_fields(body.get('extra_fields'))))
            if body.get('is_default'):
                cur.execute('UPDATE slot_services SET is_default = FALSE')
            if body.get('id'):
                cur.execute('UPDATE slot_services SET name=%s, match_values=%s, duration_min=%s, buffer_min=%s, work_days=%s, work_from=%s, work_to=%s, '
                            'is_default=%s, is_active=%s, extra_fields=%s WHERE id=%s', vals + (int(body['id']),))
            else:
                cur.execute('INSERT INTO slot_services (name, match_values, duration_min, buffer_min, work_days, work_from, work_to, is_default, is_active, extra_fields) '
                            'VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)', vals)
            conn.commit()
            return resp(200, {'services': get_services(conn)})

        if action == 'slots-service-delete':
            cur.execute('UPDATE slot_services SET is_active = FALSE, is_default = FALSE WHERE id = %s', (int(body.get('id') or 0),))
            cur.execute('DELETE FROM slot_services WHERE id = %s AND NOT EXISTS (SELECT 1 FROM slot_bookings WHERE service_id = %s)', (int(body.get('id') or 0),) * 2)
            conn.commit()
            return resp(200, {'services': get_services(conn)})

        if action == 'slots-bookings':
            cur.execute("""SELECT b.id, b.deal_id, b.deal_title, b.status, b.employee_name, b.start_at, b.end_at, b.task_id, b.event_id, b.reschedule_count,
                b.expires_at, b.created_at, b.token, s.name AS service_name FROM slot_bookings b LEFT JOIN slot_services s ON s.id = b.service_id
                ORDER BY b.id DESC LIMIT 100""")
            settings = get_settings(conn)
            rows = cur.fetchall()
            for r in rows:
                r['link'] = link_for(settings, r.pop('token'))
            ids = [r['id'] for r in rows[:20]]
            events = {}
            if ids:
                cur.execute('SELECT booking_id, step, ok, info, created_at FROM slot_events WHERE booking_id = ANY(%s) ORDER BY id', (ids,))
                for e in cur.fetchall():
                    events.setdefault(e['booking_id'], []).append(e)
            return resp(200, {'bookings': rows, 'events': events, 'timezone': settings['timezone']})

        if action == 'slots-exchange':
            try:
                limit = min(max(int(params.get('limit') or 50), 1), 100)
            except ValueError:
                limit = 50
            cur.execute("SELECT * FROM slot_exchange WHERE parent_id IS NULL ORDER BY id DESC LIMIT %s", (limit,))
            items = cur.fetchall()
            ids = [i['id'] for i in items]
            calls = {}
            if ids:
                cur.execute("SELECT * FROM slot_exchange WHERE parent_id = ANY(%s) ORDER BY id", (ids,))
                for c in cur.fetchall():
                    calls.setdefault(c['parent_id'], []).append(c)
            for i in items:
                i['calls'] = calls.get(i['id'], [])
            return resp(200, {'items': items})

        if action == 'slots-resend':
            cur.execute("SELECT * FROM slot_bookings WHERE id = %s", (int(body.get('id') or 0),))
            b = cur.fetchone()
            if not b or b['status'] != 'booked':
                return resp(404, {'error': 'Запись не найдена или не активна'})
            kind = body.get('kind')
            if kind not in ('task', 'event'):
                return resp(400, {'error': 'Неизвестный тип'})
            if (b.get('task_id') if kind == 'task' else b.get('event_id')):
                return resp(200, {'ok': True, 'already': True})
            settings = get_settings(conn)
            b['answers'] = b.get('answers') or {}
            crm_after_booking(conn, make_bx(conn), settings, get_service(conn, b['service_id']), b, b['employee_id'],
                              b['start_at'], b['end_at'], False, {kind})
            cur.execute("SELECT task_id, event_id FROM slot_bookings WHERE id = %s", (b['id'],))
            r = cur.fetchone()
            ok = bool(r['task_id'] if kind == 'task' else r['event_id'])
            return resp(200, {'ok': ok, 'error': '' if ok else 'Не удалось создать, причина в журнале записи'})

        if action == 'slots-cancel':
            cur.execute("SELECT * FROM slot_bookings WHERE id = %s", (int(body.get('id') or 0),))
            b = cur.fetchone()
            if not b:
                return resp(404, {'error': 'Не найдено'})
            cur.execute("UPDATE slot_bookings SET status = 'cancelled', updated_at = NOW() WHERE id = %s", (b['id'],))
            conn.commit()
            add_event(conn, b['id'], 'Отменено', True, 'из интерфейса')
            if b.get('event_id'):
                try:
                    make_bx(conn).call('calendar.event.delete', {'id': b['event_id']})
                except Exception:
                    pass
            return resp(200, {'ok': True})

        if action == 'slots-logo':
            raw = base64.b64decode(str(body.get('data') or '').split(',')[-1])
            if not raw or len(raw) > 2_000_000:
                return resp(400, {'error': 'Файл пустой или больше 2 МБ'})
            ct = body.get('contentType') if body.get('contentType') in ('image/png', 'image/jpeg', 'image/svg+xml', 'image/webp') else 'image/png'
            ext = {'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg', 'image/webp': 'webp'}[ct]
            key = f'slots/logo-{secrets.token_hex(6)}.{ext}'
            s3 = boto3.client('s3', endpoint_url='https://bucket.poehali.dev', aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                              aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])
            s3.put_object(Bucket='files', Key=key, Body=raw, ContentType=ct)
            return resp(200, {'url': f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"})

        bx = make_bx(conn)
        if not bx.url.startswith('http'):
            return resp(400, {'error': 'Не задан вебхук Битрикс24'})

        if action == 'slots-meta':
            out = {'settings': public_settings(get_settings(conn)), 'services': get_services(conn), 'categories': [], 'departments': [], 'fields': [], 'errors': []}
            try:
                cats = bx.call('crm.category.list', {'entityTypeId': 2}) or {}
                cl = cats.get('categories') if isinstance(cats, dict) else cats
                out['categories'] = [{'id': str(c['id']), 'name': c['name']} for c in (cl or [])]
                if not any(c['id'] == '0' for c in out['categories']):
                    out['categories'].insert(0, {'id': '0', 'name': 'Общая воронка'})
            except Exception as e:
                out['errors'].append(str(e))
            try:
                out['departments'] = [{'id': str(d['ID']), 'name': d['NAME']} for d in (bx.call('department.get') or [])]
            except Exception as e:
                out['errors'].append(str(e))
            for code, f in bx.fields('deal').items():
                if not isinstance(f, dict):
                    continue
                label = f.get('formLabel') or f.get('listLabel') or f.get('title') or code
                if isinstance(label, dict):
                    label = label.get('ru') or next(iter(label.values()), code)
                out['fields'].append({'code': code, 'title': str(label), 'type': f.get('type'), 'multiple': bool(f.get('isMultiple')),
                                      'items': [{'id': str(i.get('ID')), 'value': i.get('VALUE')} for i in (f.get('items') or []) if isinstance(i, dict)]})
            out['fields'].sort(key=lambda x: (not x['code'].startswith('UF_'), x['title'].lower()))
            return resp(200, out)

        if action == 'slots-preview':
            settings = get_settings(conn)
            deal_id = digits(params.get('deal'))
            bx = make_bx(conn)
            deal = bx.call('crm.deal.get', {'id': deal_id}) or {}
            tz = ZoneInfo(settings['timezone'])
            ls = to_local(utcnow() + timedelta(days=1), tz).replace(hour=9, minute=0, second=0, microsecond=0)
            svc = {'name': 'Перерегистрация кассы или замена ФН'}
            return resp(200, {
                'title': render_template(bx, settings['task_title'], deal, tz, settings.get('start_field'), ls, svc, deal_id),
                'description': render_template(bx, settings.get('task_description'), deal, tz, settings.get('start_field'), ls, svc, deal_id),
            })

        if action == 'slots-stages':
            cat = digits(params.get('category')) or '0'
            ent = 'DEAL_STAGE' if cat == '0' else f'DEAL_STAGE_{cat}'
            items = bx.call('crm.status.entity.items', {'entityId': ent}) or []
            return resp(200, {'stages': [{'id': i['STATUS_ID'], 'name': i['NAME']} for i in items]})

        if action == 'slots-users':
            return resp(200, {'users': list_users(bx, digits(params.get('department')), params.get('q') or '')})

        if action == 'slots-deals':
            s = get_settings(conn)
            if not s.get('source_stage_id'):
                return resp(200, {'deals': [], 'note': 'Не выбран этап «Согласование времени»'})
            deals = bx.call('crm.deal.list', {'filter': {'STAGE_ID': s['source_stage_id']}, 'select': ['ID', 'TITLE', 'ASSIGNED_BY_ID', 'DATE_MODIFY'],
                                              'order': {'DATE_MODIFY': 'DESC'}}) or []
            ids = [str(d['ID']) for d in deals[:50]]
            st = {}
            if ids:
                cur.execute("SELECT DISTINCT ON (deal_id) deal_id, status, start_at, token FROM slot_bookings WHERE deal_id = ANY(%s) ORDER BY deal_id, id DESC", (ids,))
                st = {r['deal_id']: r for r in cur.fetchall()}
            out = []
            for d in deals[:50]:
                r = st.get(str(d['ID']))
                out.append({'id': str(d['ID']), 'title': d['TITLE'], 'status': r['status'] if r else 'none',
                            'start': iso_z(r['start_at']) if r and r['start_at'] else None, 'link': link_for(s, r['token']) if r else ''})
            return resp(200, {'deals': out})

        if action == 'slots-invite':
            deal_id = digits(body.get('dealId'))
            if not deal_id:
                return resp(400, {'ok': False, 'error': 'Не указан номер сделки'})
            r = invite(conn, bx, deal_id, 'console')
            return resp(200 if r.get('ok') else 400, r)

        if action == 'slots-webhook-test':
            need = {'crm': 'CRM', 'calendar': 'Календарь', 'task': 'Задачи', 'user': 'Пользователи', 'department': 'Структура компании'}
            try:
                have = bx.call('scope') or []
            except Exception as e:
                return resp(200, {'ok': False, 'error': str(e)})
            return resp(200, {'ok': True, 'missing': [v for k, v in need.items() if k not in have and not (k == 'user' and 'user_basic' in have)]})

        if action == 'slots-busy-check':
            s = get_settings(conn)
            tz = ZoneInfo(s['timezone'])
            emps = [str(e['id']) for e in s['employees']]
            today = to_local(utcnow(), tz).date()
            busy, err = bitrix_busy(bx, emps, today, today + timedelta(days=7), tz)
            return resp(200, {'ok': err is None, 'error': err, 'busy': {
                emp_name(s, e): [f"{fmt_local(a, tz)} — {fmt_local(b, tz)}" for a, b in items] for e, items in busy.items()}})

        return resp(400, {'error': 'Unknown action'})
    finally:
        conn.close()
