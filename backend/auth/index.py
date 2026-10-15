import hashlib
import json
import os
import re
import secrets
from datetime import datetime, timedelta

import psycopg2
import requests
from psycopg2.extras import RealDictCursor

SEND_URL = 'https://functions.poehali.dev/ace36e55-b169-41f2-9d2b-546f92221bb7'
CHANNELS = {
    'email': {'provider': 'ek_email', 'title': 'Почта'},
    'telegram': {'provider': 'ek_tg', 'title': 'Telegram'},
    'whatsapp': {'provider': 'ek_wa', 'title': 'WhatsApp'},
    'max': {'provider': 'ek_max', 'title': 'MAX'},
}
CODE_TTL_MIN = 10
SESSION_DAYS = 30
MAX_CODES_PER_10_MIN = 5
MAX_ATTEMPTS = 5
HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
}


def resp(status, data):
    return {'statusCode': status, 'headers': HEADERS, 'body': json.dumps(data, ensure_ascii=False, default=str)}


def db():
    return psycopg2.connect(os.environ['DATABASE_URL'], cursor_factory=RealDictCursor)


def sha(text):
    return hashlib.sha256(text.encode()).hexdigest()


def norm_phone(v):
    d = re.sub(r'\D', '', v or '')
    if len(d) == 11 and d.startswith('8'):
        d = '7' + d[1:]
    return d


def find_user(cur, identifier):
    ident = (identifier or '').strip().lower()
    if not ident:
        return None
    if '@' in ident:
        cur.execute("SELECT * FROM auth_users WHERE lower(email) = %s AND is_active = true", (ident,))
    else:
        cur.execute("SELECT * FROM auth_users WHERE phone = %s AND is_active = true", (norm_phone(ident),))
    return cur.fetchone()


def user_by_token(cur, token):
    if not token:
        return None
    cur.execute(
        """SELECT u.id, u.email, u.phone FROM auth_sessions s
        JOIN auth_users u ON u.id = s.user_id
        WHERE s.token_hash = %s AND s.expires_at > NOW() AND u.is_active = true""",
        (sha(token),),
    )
    return cur.fetchone()


def api_key(cur):
    cur.execute("SELECT api_key FROM api_keys WHERE is_active = true AND (expiry_date IS NULL OR expiry_date > NOW()) ORDER BY id LIMIT 1")
    row = cur.fetchone()
    return row['api_key'] if row else ''


def mask(v):
    if '@' in v:
        name, dom = v.split('@', 1)
        return name[:2] + '***@' + dom
    return '+' + v[:1] + '***' + v[-4:]


def handler(event: dict, context) -> dict:
    """Вход в веб-интерфейс по одноразовому коду: отправка кода, проверка, сессия, выход"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
            'Access-Control-Max-Age': '86400'}, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')
    headers = {str(k).lower(): v for k, v in (event.get('headers') or {}).items()}
    token = headers.get('x-auth-token', '')
    body = {}
    if event.get('body'):
        try:
            body = json.loads(event['body'])
        except Exception:
            body = {}

    conn = db()
    cur = conn.cursor()
    try:
        if action == 'me':
            user = user_by_token(cur, token)
            if not user:
                return resp(401, {'ok': False, 'error': 'Не авторизован'})
            return resp(200, {'ok': True, 'email': user['email']})

        if action == 'logout':
            if token:
                cur.execute("DELETE FROM auth_sessions WHERE token_hash = %s", (sha(token),))
                conn.commit()
            return resp(200, {'ok': True})

        if action == 'channels':
            return resp(200, {'channels': [{'id': k, 'title': v['title']} for k, v in CHANNELS.items()]})

        if action == 'request':
            channel = body.get('channel', '')
            if channel not in CHANNELS:
                return resp(400, {'ok': False, 'error': 'Неизвестный способ отправки'})
            user = find_user(cur, body.get('identifier'))
            if not user:
                return resp(200, {'ok': True, 'sent': True, 'to': ''})

            cur.execute(
                "SELECT COUNT(*) AS n FROM auth_codes WHERE user_id = %s AND created_at > NOW() - INTERVAL '10 minutes'",
                (user['id'],),
            )
            if cur.fetchone()['n'] >= MAX_CODES_PER_10_MIN:
                return resp(429, {'ok': False, 'error': 'Слишком много запросов. Попробуйте через 10 минут'})

            code = f"{secrets.randbelow(1000000):06d}"
            recipient = user['email'] if channel == 'email' else user['phone']
            text = f"Код входа в Ekomkassa Integration Hub: {code}. Действует {CODE_TTL_MIN} минут. Никому не сообщайте."
            payload = {'provider': CHANNELS[channel]['provider'], 'recipient': recipient, 'message': text}
            if channel == 'email':
                payload['subject'] = 'Код входа'
            try:
                r = requests.post(SEND_URL, json=payload, headers={'X-Api-Key': api_key(cur)}, timeout=15)
                ok = r.status_code == 200 and r.json().get('success')
            except Exception:
                ok = False
            if not ok:
                return resp(502, {'ok': False, 'error': 'Не удалось отправить код этим способом. Выберите другой'})

            cur.execute(
                "INSERT INTO auth_codes (user_id, code_hash, channel, expires_at) VALUES (%s, %s, %s, %s)",
                (user['id'], sha(f"{user['id']}:{code}"), channel, datetime.utcnow() + timedelta(minutes=CODE_TTL_MIN)),
            )
            conn.commit()
            return resp(200, {'ok': True, 'sent': True, 'to': mask(recipient)})

        if action == 'verify':
            user = find_user(cur, body.get('identifier'))
            code = re.sub(r'\D', '', str(body.get('code', '')))
            bad = resp(400, {'ok': False, 'error': 'Неверный или просроченный код'})
            if not user or len(code) != 6:
                return bad
            cur.execute(
                """SELECT id, code_hash, attempts FROM auth_codes
                WHERE user_id = %s AND used = false AND expires_at > NOW()
                ORDER BY id DESC LIMIT 1""",
                (user['id'],),
            )
            row = cur.fetchone()
            if not row or row['attempts'] >= MAX_ATTEMPTS:
                return bad
            if row['code_hash'] != sha(f"{user['id']}:{code}"):
                cur.execute("UPDATE auth_codes SET attempts = attempts + 1 WHERE id = %s", (row['id'],))
                conn.commit()
                return bad
            cur.execute("UPDATE auth_codes SET used = true WHERE user_id = %s", (user['id'],))
            new_token = secrets.token_urlsafe(32)
            cur.execute(
                "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES (%s, %s, %s)",
                (user['id'], sha(new_token), datetime.utcnow() + timedelta(days=SESSION_DAYS)),
            )
            cur.execute("DELETE FROM auth_sessions WHERE expires_at < NOW()")
            conn.commit()
            return resp(200, {'ok': True, 'token': new_token, 'email': user['email']})

        return resp(400, {'ok': False, 'error': 'Неизвестное действие'})
    finally:
        cur.close()
        conn.close()
