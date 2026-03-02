import json
import os
import asyncio
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor
from telethon import TelegramClient
from telethon.sessions import StringSession

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

async def send_code(api_id: int, api_hash: str, session_str: str, phone: str):
    client = TelegramClient(StringSession(session_str), api_id, api_hash)
    await client.connect()
    result = await client.send_code_request(phone)
    session_new = client.session.save()
    await client.disconnect()
    return result.phone_code_hash, session_new

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Отправляет OTP-код через Telegram (auth.sendCode).
    POST / — принимает provider_code и phone, возвращает session_id для последующей верификации.
    Headers: X-Api-Key
    Body: {"provider_code": "...", "phone": "+79991234567"}
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

    if not provider_code or not phone:
        conn.close()
        return {'statusCode': 400, 'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Missing provider_code or phone'}), 'isBase64Encoded': False}

    tg_api_id, tg_api_hash, tg_session = get_tg_credentials(provider_code, conn)
    if not tg_api_id or not tg_api_hash:
        conn.close()
        return {'statusCode': 400, 'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'Telegram credentials not configured'}), 'isBase64Encoded': False}

    try:
        phone_code_hash, session_new = asyncio.get_event_loop().run_until_complete(
            send_code(int(str(tg_api_id).strip()), tg_api_hash.strip(), tg_session or '', phone)
        )
    except Exception as e:
        conn.close()
        err = str(e)
        print(f"[TG-SEND] Error: {err}")
        # Маппим ошибки Telegram на понятные коды
        error_map = {
            'PHONE_NUMBER_INVALID': 'Неверный формат номера телефона',
            'PHONE_NUMBER_BANNED': 'Этот номер телефона заблокирован в Telegram',
            'API_ID_INVALID': 'Неверные API ID или API Hash провайдера',
            'API_ID_PUBLISHED_FLOOD': 'API ID перегружен, попробуйте позже',
            'FLOOD_WAIT': 'Слишком много запросов, попробуйте позже',
        }
        friendly = next((v for k, v in error_map.items() if k in err), err)
        return {'statusCode': 400, 'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': friendly, 'error_raw': err}), 'isBase64Encoded': False}

    import uuid as uuid_mod
    # Сохраняем сессию обратно в конфиг провайдера (StringSession)
    cur = conn.cursor()
    cur.execute(
        "UPDATE providers SET config = COALESCE(config, '{}'::jsonb) || %s::jsonb WHERE provider_code = %s",
        (json.dumps({'tg_session': session_new}), provider_code)
    )

    # Удаляем старые сессии для этого номера и сохраняем новую
    cur.execute(
        "DELETE FROM tg_otp_sessions WHERE provider_code = %s AND phone = %s",
        (provider_code, phone)
    )
    cur.execute(
        "INSERT INTO tg_otp_sessions (provider_code, phone, phone_code_hash) VALUES (%s, %s, %s)",
        (provider_code, phone, phone_code_hash)
    )
    # Пишем в лог сообщений как pending (ожидает верификации)
    message_id = f"tgotp_{uuid_mod.uuid4().hex[:16]}"
    cur.execute(
        """INSERT INTO messages (message_id, provider, recipient, message_text, status, attempts, created_at)
           VALUES (%s, %s, %s, %s, 'pending', 1, NOW())""",
        (message_id, provider_code, phone, 'OTP code sent, awaiting verification')
    )
    conn.commit()
    cur.close()
    conn.close()

    print(f"[TG-SEND] Code sent to {phone}, hash saved, logged as {message_id}")
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'success': True, 'message': 'Code sent via Telegram'}),
        'isBase64Encoded': False
    }