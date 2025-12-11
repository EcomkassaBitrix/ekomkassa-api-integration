import json
import os
import time
import uuid
import requests
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
    cur.close()
    return result is not None

def get_message(message_id: str, conn) -> Optional[Dict]:
    """Получает сообщение из БД"""
    cur = conn.cursor()
    cur.execute(
        """SELECT message_id, provider, recipient, message_text, status, attempts
        FROM messages WHERE message_id = %s""",
        (message_id,)
    )
    result = cur.fetchone()
    cur.close()
    return result

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

def send_via_wappi(recipient: str, message: str) -> Tuple[int, str]:
    """Отправляет сообщение через Wappi API"""
    try:
        wappi_token = os.environ.get('WAPPI_TOKEN')
        wappi_profile_id = os.environ.get('WAPPI_PROFILE_ID')
        
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
    """Симулирует отправку через провайдера"""
    time.sleep(0.1)
    
    import random
    success_rate = 0.8
    
    if random.random() < success_rate:
        return 200, json.dumps({"success": True, "message_id": str(uuid.uuid4())})
    else:
        return 500, json.dumps({"success": False, "error": "Provider temporary unavailable"})

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Переотправляет failed сообщения вручную
    
    POST /api/retry
    Body: {"message_id": "msg_abc123"}
    Headers: X-Api-Key
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
                'body': json.dumps({'error': 'Missing API key'}),
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
        message_id = body_data.get('message_id')
        
        if not message_id:
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Missing message_id'}),
                'isBase64Encoded': False
            }
        
        message = get_message(message_id, conn)
        
        if not message:
            conn.close()
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Message not found'}),
                'isBase64Encoded': False
            }
        
        if message['status'] == 'delivered':
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'error': 'Message already delivered',
                    'message_id': message_id
                }),
                'isBase64Encoded': False
            }
        
        attempt_number = message['attempts'] + 1
        start_time = time.time()
        
        try:
            if message['provider'] in ['whatsapp_business', 'telegram_bot', 'wappi']:
                status_code, response_body = send_via_wappi(
                    message['recipient'], 
                    message['message_text']
                )
            else:
                status_code, response_body = simulate_provider_send(
                    message['provider'], 
                    message['recipient'], 
                    message['message_text']
                )
            duration_ms = int((time.time() - start_time) * 1000)
            
            if status_code == 200:
                log_attempt(message_id, attempt_number, message['provider'], 
                           'success', status_code, response_body, None, duration_ms, conn)
                update_message_status(message_id, 'delivered', attempt_number, None, conn)
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'success': True,
                        'message_id': message_id,
                        'status': 'delivered',
                        'attempts': attempt_number
                    }),
                    'isBase64Encoded': False
                }
            else:
                error_msg = f"Provider returned status {status_code}"
                log_attempt(message_id, attempt_number, message['provider'], 
                           'failed', status_code, response_body, error_msg, duration_ms, conn)
                update_message_status(message_id, 'failed', attempt_number, error_msg, conn)
                conn.close()
                
                return {
                    'statusCode': 500,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'success': False,
                        'message_id': message_id,
                        'status': 'failed',
                        'attempts': attempt_number,
                        'error': error_msg
                    }),
                    'isBase64Encoded': False
                }
                
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            error_msg = str(e)
            log_attempt(message_id, attempt_number, message['provider'], 
                       'error', None, '', error_msg, duration_ms, conn)
            update_message_status(message_id, 'failed', attempt_number, error_msg, conn)
            conn.close()
            
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': False,
                    'message_id': message_id,
                    'status': 'failed',
                    'error': error_msg
                }),
                'isBase64Encoded': False
            }
        
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid JSON'}),
            'isBase64Encoded': False
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)}),
            'isBase64Encoded': False
        }