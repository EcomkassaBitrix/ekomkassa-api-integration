import json
import os
import asyncio
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.errors import SessionPasswordNeededError, PhoneCodeInvalidError, PhoneCodeExpiredError

def get_db_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'], cursor_factory=RealDictCursor)

def verify_api_key(api_key: str, conn) -> bool:
    cur = conn.cursor()
    cur.execute("SELECT id FROM api_keys WHERE api_key = %s AND is_active = true", (api_key,))
    result = cur.fetchone()
    cur.close()
    return result is not None

def get_tg_credentials(provider_code: str, conn):
    cur = conn.cursor()
    cur.execute("SELECT config FROM providers WHERE provider_code = %s", (provider_code,))
    result = cur.fetchone()
    cur.close()
    if not result or not result['config']:
        return None, None, None
    config = result['config']
    return config.get('tg_api_id'), config.get('tg_api_hash'), config.get('tg_session', '')

def get_otp_session(provider_code: str, phone: str, conn):
    cur = conn.cursor()
    cur.execute(
        """SELECT phone_code_hash FROM tg_otp_sessions
           WHERE provider_code = %s AND phone = %s AND expires_at > NOW()
           ORDER BY created_at DESC LIMIT 1""",
        (provider_code, phone)
    )
    result = cur.fetchone()
    cur.close()
    return result['phone_code_hash'] if result else None

async def verify_code(api_id: int, api_hash: str, session_str: str, phone: str, code: str, phone_code_hash: str, password: str = None):
    client = TelegramClient(StringSession(session_str), api_id, api_hash)
    await client.connect()
    try:
        await client.sign_in(phone=phone, code=code, phone_code_hash=phone_code_hash)
        session_new = client.session.save()
        await client.disconnect()
        return True, None, session_new
    except PhoneCodeInvalidError:
        await client.disconnect()
        return False, 'invalid_code', None
    except PhoneCodeExpiredError:
        await client.disconnect()
        return False, 'expired_code', None
    except SessionPasswordNeededError:
        if not password:
            await client.disconnect()
            return False, '2fa_required', None
        try:
            await client.sign_in(password=password)
            session_new = client.session.save()
            await client.disconnect()
            return True, None, session_new
        except Exception:
            await client.disconnect()
            return False, '2fa_invalid', None

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Проверяет OTP-код, введённый пользователем (auth.signIn).
    POST / — принимает provider_code, phone и code.
    Headers: X-Api-Key
    Body: {"provider_code": "...", "phone": "+79991234567", "code": "12345"}
    """
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key', 'Access-Control-Max-Age': '86400'}, 'body': ''}

    if event.get('httpMethod') != 'POST':
        return {'statusCode': 405, 'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Method not allowed'}), 'isBase64Encoded': False}

    headers = event.get('headers', {})
    api_key = headers.get('x-api-key') or headers.get('X-Api-Key')
    if not api_key:
        return {'statusCode': 401, 'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Missing API key'}), 'isBase64Encoded': False}

    conn = get_db_connection()
    if not verify_api_key(api_key, conn):
        conn.close()
        return {'statusCode': 401, 'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Invalid API key'}), 'isBase64Encoded': False}

    body = json.loads(event.get('body', '{}'))
    provider_code = body.get('provider_code')
    phone = body.get('phone')
    code = body.get('code')
    password = body.get('password')

    if not provider_code or not phone or not code:
        conn.close()
        return {'statusCode': 400, 'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Missing provider_code, phone or code'}), 'isBase64Encoded': False}

    phone_code_hash = get_otp_session(provider_code, phone, conn)
    if not phone_code_hash:
        conn.close()
        return {'statusCode': 400, 'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Session not found or expired. Request a new code.'}), 'isBase64Encoded': False}

    tg_api_id, tg_api_hash, tg_session = get_tg_credentials(provider_code, conn)
    if not tg_api_id or not tg_api_hash:
        conn.close()
        return {'statusCode': 400, 'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Telegram credentials not configured'}), 'isBase64Encoded': False}

    try:
        success, error_type, session_new = asyncio.get_event_loop().run_until_complete(
            verify_code(int(str(tg_api_id).strip()), tg_api_hash.strip(), tg_session or '', phone, str(code), phone_code_hash, password)
        )
    except Exception as e:
        conn.close()
        print(f"[TG-VERIFY] Error: {e}")
        return {'statusCode': 500, 'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': str(e)}), 'isBase64Encoded': False}

    if success:
        cur = conn.cursor()
        # Сохраняем обновлённую сессию
        if session_new:
            cur.execute(
                "UPDATE providers SET config = COALESCE(config, '{}'::jsonb) || %s::jsonb WHERE provider_code = %s",
                (json.dumps({'tg_session': session_new}), provider_code)
            )
        cur.execute("DELETE FROM tg_otp_sessions WHERE provider_code = %s AND phone = %s", (provider_code, phone))
        conn.commit()
        cur.close()
        conn.close()
        print(f"[TG-VERIFY] Code verified for {phone}")
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True, 'verified': True}),
            'isBase64Encoded': False
        }

    conn.close()
    error_messages = {
        'invalid_code': 'Неверный код',
        'expired_code': 'Код истёк, запросите новый',
        '2fa_required': 'Требуется пароль двухфакторной аутентификации',
        '2fa_invalid': 'Неверный пароль двухфакторной аутентификации',
    }
    return {
        'statusCode': 400,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'success': False, 'error': error_messages.get(error_type, 'Ошибка верификации'), 'error_type': error_type}),
        'isBase64Encoded': False
    }