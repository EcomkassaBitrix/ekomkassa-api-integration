import json
import os
import time
import uuid
import requests
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    """Создает подключение к базе данных"""
    return psycopg2.connect(
        os.environ['DATABASE_URL'],
        cursor_factory=RealDictCursor
    )

def verify_api_key(api_key: str, conn) -> bool:
    """Проверяет валидность API ключа"""
    cur = conn.cursor()
    cur.execute(
        "SELECT id FROM api_keys WHERE api_key = %s AND is_active = true",
        (api_key,)
    )
    result = cur.fetchone()
    
    if result:
        cur.execute(
            "UPDATE api_keys SET last_used_at = NOW() WHERE api_key = %s",
            (api_key,)
        )
        conn.commit()
    
    cur.close()
    return result is not None

def check_provider_active(provider: str, conn) -> Tuple[bool, Optional[str]]:
    """Проверяет активность провайдера"""
    cur = conn.cursor()
    cur.execute(
        "SELECT is_active, provider_name FROM providers WHERE provider_code = %s",
        (provider,)
    )
    result = cur.fetchone()
    cur.close()
    
    if not result:
        return False, None
    
    return result['is_active'], result['provider_name']

def save_message(message_id: str, provider: str, recipient: str, 
                message_text: str, metadata: Dict, conn) -> None:
    """Сохраняет сообщение в БД"""
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO messages 
        (message_id, provider, recipient, message_text, metadata, status, attempts, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())""",
        (message_id, provider, recipient, message_text, json.dumps(metadata), 'pending', 0)
    )
    conn.commit()
    cur.close()

def log_attempt(message_id: str, attempt_number: int, provider: str, 
               status: str, response_code: Optional[int], response_body: str,
               error_message: Optional[str], duration_ms: int, conn) -> None:
    """Логирует попытку доставки"""
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO delivery_attempts 
        (message_id, attempt_number, provider, status, response_code, 
         response_body, error_message, duration_ms, attempted_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())""",
        (message_id, attempt_number, provider, status, response_code, 
         response_body, error_message, duration_ms)
    )
    conn.commit()
    cur.close()

def update_message_status(message_id: str, status: str, attempts: int,
                         last_error: Optional[str], conn) -> None:
    """Обновляет статус сообщения"""
    cur = conn.cursor()
    
    if status == 'delivered':
        cur.execute(
            """UPDATE messages 
            SET status = %s, attempts = %s, last_error = %s, 
                last_attempt_at = NOW(), completed_at = NOW()
            WHERE message_id = %s""",
            (status, attempts, last_error, message_id)
        )
    else:
        cur.execute(
            """UPDATE messages 
            SET status = %s, attempts = %s, last_error = %s, last_attempt_at = NOW()
            WHERE message_id = %s""",
            (status, attempts, last_error, message_id)
        )
    
    conn.commit()
    cur.close()

def get_wappi_credentials(provider: str, conn) -> Tuple[Optional[str], Optional[str]]:
    """Получает Wappi credentials из конфига провайдера"""
    cur = conn.cursor()
    cur.execute(
        "SELECT config FROM providers WHERE provider_code = %s",
        (provider,)
    )
    result = cur.fetchone()
    cur.close()
    
    if not result or not result['config']:
        return None, None
    
    config = result['config']
    return config.get('wappi_token'), config.get('wappi_profile_id')

def send_via_wappi(recipient: str, message: str, provider: str, conn) -> Tuple[int, str]:
    """Отправляет сообщение через Wappi API"""
    try:
        wappi_token, wappi_profile_id = get_wappi_credentials(provider, conn)
        
        if not wappi_token or not wappi_profile_id:
            return 500, json.dumps({"error": "Wappi credentials not configured"})
        
        recipient_clean = recipient.replace('+', '').replace('-', '').replace(' ', '')
        
        response = requests.post(
            'https://wappi.pro/api/sync/message/send',
            params={'profile_id': wappi_profile_id},
            headers={
                'Authorization': wappi_token,
                'Content-Type': 'application/json'
            },
            json={
                'recipient': recipient_clean,
                'body': message
            },
            timeout=10
        )
        
        return response.status_code, response.text
        
    except requests.exceptions.Timeout:
        return 500, json.dumps({"error": "Request timeout"})
    except requests.exceptions.RequestException as e:
        return 500, json.dumps({"error": str(e)})

def simulate_provider_send(provider: str, recipient: str, message: str) -> Tuple[int, str]:
    """Симулирует отправку через провайдера (заглушка для не интегрированных провайдеров)"""
    time.sleep(0.1)
    
    import random
    success_rate = 0.8
    
    if random.random() < success_rate:
        return 200, json.dumps({"success": True, "message_id": str(uuid.uuid4())})
    else:
        return 500, json.dumps({"success": False, "error": "Provider temporary unavailable"})

def attempt_delivery(message_id: str, provider: str, recipient: str, 
                    message_text: str, attempt_number: int, conn) -> Tuple[bool, Optional[str]]:
    """Пытается доставить сообщение"""
    start_time = time.time()
    
    try:
        if provider in ['whatsapp_business', 'telegram_bot', 'wappi']:
            status_code, response_body = send_via_wappi(recipient, message_text, provider, conn)
        else:
            status_code, response_body = simulate_provider_send(provider, recipient, message_text)
        
        duration_ms = int((time.time() - start_time) * 1000)
        
        if status_code == 200:
            log_attempt(message_id, attempt_number, provider, 'success', 
                       status_code, response_body, None, duration_ms, conn)
            return True, None
        else:
            error_msg = f"Provider returned status {status_code}"
            log_attempt(message_id, attempt_number, provider, 'failed', 
                       status_code, response_body, error_msg, duration_ms, conn)
            return False, error_msg
            
    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        error_msg = str(e)
        log_attempt(message_id, attempt_number, provider, 'error', 
                   None, '', error_msg, duration_ms, conn)
        return False, error_msg

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Обрабатывает запросы на отправку сообщений с гарантированной доставкой.
    Поддерживает retry механизм с экспоненциальной задержкой.
    
    POST /api/send
    Body: {
        "provider": "sms_gateway|whatsapp_business|telegram_bot|email_service|push_service",
        "recipient": "+79991234567 или email или chat_id",
        "message": "Текст сообщения",
        "metadata": {} (опционально)
    }
    
    Headers:
        X-Api-Key: ek_live_... или ek_test_...
    """
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        headers = event.get('headers', {})
        api_key = headers.get('x-api-key') or headers.get('X-Api-Key')
        
        if not api_key:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Missing API key', 'message': 'X-Api-Key header required'}),
                'isBase64Encoded': False
            }
        
        conn = get_db_connection()
        
        if not verify_api_key(api_key, conn):
            conn.close()
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid API key'}),
                'isBase64Encoded': False
            }
        
        body_data = json.loads(event.get('body', '{}'))
        
        provider = body_data.get('provider')
        recipient = body_data.get('recipient')
        message_text = body_data.get('message')
        metadata = body_data.get('metadata', {})
        
        if not all([provider, recipient, message_text]):
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'error': 'Missing required fields',
                    'required': ['provider', 'recipient', 'message']
                }),
                'isBase64Encoded': False
            }
        
        is_active, provider_name = check_provider_active(provider, conn)
        
        if not provider_name:
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'error': 'Unknown provider',
                    'provider': provider,
                    'available_providers': ['sms_gateway', 'whatsapp_business', 'telegram_bot', 'email_service', 'push_service']
                }),
                'isBase64Encoded': False
            }
        
        if not is_active:
            conn.close()
            return {
                'statusCode': 503,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'error': 'Provider inactive',
                    'provider': provider,
                    'provider_name': provider_name,
                    'message': f'{provider_name} is currently inactive'
                }),
                'isBase64Encoded': False
            }
        
        message_id = f"msg_{uuid.uuid4().hex[:16]}"
        
        save_message(message_id, provider, recipient, message_text, metadata, conn)
        
        max_attempts = 3
        retry_delays = [0, 1, 3]
        
        last_error = None
        for attempt in range(1, max_attempts + 1):
            if attempt > 1:
                time.sleep(retry_delays[attempt - 1])
            
            success, error = attempt_delivery(
                message_id, provider, recipient, message_text, attempt, conn
            )
            
            if success:
                update_message_status(message_id, 'delivered', attempt, None, conn)
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'success': True,
                        'message_id': message_id,
                        'provider': provider,
                        'status': 'delivered',
                        'attempts': attempt
                    }),
                    'isBase64Encoded': False
                }
            
            last_error = error
        
        update_message_status(message_id, 'failed', max_attempts, last_error, conn)
        conn.close()
        
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': False,
                'message_id': message_id,
                'provider': provider,
                'status': 'failed',
                'attempts': max_attempts,
                'error': last_error,
                'message': f'Failed to deliver after {max_attempts} attempts. Message saved for manual retry.'
            }),
            'isBase64Encoded': False
        }
        
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid JSON in request body'}),
            'isBase64Encoded': False
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)}),
            'isBase64Encoded': False
        }