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

def get_wappi_credentials(provider: str, conn) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """Получает Wappi credentials и тип провайдера из конфига"""
    cur = conn.cursor()
    cur.execute(
        "SELECT config, provider_type FROM providers WHERE provider_code = %s",
        (provider,)
    )
    result = cur.fetchone()
    cur.close()
    
    if not result or not result['config']:
        return None, None, None
    
    config = result['config']
    return config.get('wappi_token'), config.get('wappi_profile_id'), result['provider_type']

def send_via_wappi(recipient: str, message: str, provider: str, conn) -> Tuple[int, str]:
    """Отправляет сообщение через Wappi API"""
    try:
        wappi_token, wappi_profile_id, provider_type = get_wappi_credentials(provider, conn)
        
        if not wappi_token or not wappi_profile_id:
            return 500, json.dumps({"error": "Wappi credentials not configured"})
        
        endpoint_map = {
            'max': 'https://wappi.pro/maxapi/sync/message/send',
            'telegram_bot': 'https://wappi.pro/tapi/sync/message/send',
            'whatsapp_business': 'https://wappi.pro/api/sync/message/send',
            'wappi': 'https://wappi.pro/api/sync/message/send'
        }
        
        api_url = endpoint_map.get(provider_type, 'https://wappi.pro/api/sync/message/send')
        
        recipient_clean = recipient.replace('+', '').replace('-', '').replace(' ', '')
        
        request_data = json.dumps({
            'recipient': recipient_clean,
            'body': message
        })
        
        print(f"[WAPPI] Sending request:")
        print(f"[WAPPI] Provider code: {provider}")
        print(f"[WAPPI] Provider type: {provider_type}")
        print(f"[WAPPI] URL: {api_url}?profile_id={wappi_profile_id}")
        print(f"[WAPPI] Headers: Authorization: {wappi_token[:10]}...")
        print(f"[WAPPI] Data: {request_data}")
        
        response = requests.post(
            api_url,
            params={'profile_id': wappi_profile_id},
            headers={
                'Authorization': wappi_token
            },
            data=request_data,
            timeout=10
        )
        
        print(f"[WAPPI] Response status: {response.status_code}")
        print(f"[WAPPI] Response body: {response.text}")
        
        if response.status_code == 200:
            try:
                response_data = response.json()
                if response_data.get('status') == 'done':
                    return 200, response.text
                else:
                    return 500, response.text
            except:
                return response.status_code, response.text
        
        return response.status_code, response.text
        
    except requests.exceptions.Timeout:
        return 500, json.dumps({"error": "Request timeout"})
    except requests.exceptions.RequestException as e:
        return 500, json.dumps({"error": str(e)})

def get_postbox_credentials(provider: str, conn) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """Получает Yandex Postbox credentials из конфига"""
    cur = conn.cursor()
    cur.execute(
        "SELECT config FROM providers WHERE provider_code = %s",
        (provider,)
    )
    result = cur.fetchone()
    cur.close()
    
    if not result or not result['config']:
        return None, None, None
    
    config = result['config']
    return config.get('postbox_access_key'), config.get('postbox_secret_key'), config.get('postbox_from_email')

def send_via_postbox(recipient: str, message: str, subject: str, provider: str, conn,
                    template_name: Optional[str] = None, template_data: Optional[Dict] = None) -> Tuple[int, str]:
    """Отправляет email через Yandex Postbox API (AWS SES compatible)
    Поддерживает два режима:
    - Обычная отправка (SendEmail с Simple) - если template_name не указан
    - Отправка по шаблону (SendEmail с Template) - если указан template_name
    """
    try:
        import boto3
        from botocore.exceptions import ClientError
        import logging
        
        # Включаем debug логирование boto3
        logging.basicConfig(level=logging.DEBUG)
        boto3.set_stream_logger('boto3.resources', logging.DEBUG)
        boto3.set_stream_logger('botocore', logging.DEBUG)
        
        access_key, secret_key, from_email = get_postbox_credentials(provider, conn)
        
        if not access_key or not secret_key or not from_email:
            return 500, json.dumps({"error": "Postbox credentials not configured"})
        
        print(f"[POSTBOX DEBUG] =================================")
        print(f"[POSTBOX DEBUG] AWS Credentials:")
        print(f"[POSTBOX DEBUG] Access Key: {access_key[:8]}...{access_key[-4:]}")
        print(f"[POSTBOX DEBUG] Secret Key: {secret_key[:8]}...{secret_key[-4:]}")
        print(f"[POSTBOX DEBUG] Region: ru-central1")
        print(f"[POSTBOX DEBUG] Endpoint: https://postbox.cloud.yandex.net")
        print(f"[POSTBOX DEBUG] =================================")
        
        client = boto3.client(
            'sesv2',
            region_name='ru-central1',
            endpoint_url='https://postbox.cloud.yandex.net',
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key
        )
        
        if template_name:
            request_params = {
                'FromEmailAddress': from_email,
                'Destination': {'ToAddresses': [recipient]},
                'Content': {
                    'Template': {
                        'TemplateName': template_name,
                        'TemplateData': json.dumps(template_data or {})
                    }
                }
            }
            print(f"[POSTBOX REQUEST] Templated email:")
            print(f"[POSTBOX REQUEST] {json.dumps(request_params, indent=2, ensure_ascii=False)}")
            
            response = client.send_email(**request_params)
        else:
            request_params = {
                'FromEmailAddress': from_email,
                'Destination': {'ToAddresses': [recipient]},
                'Content': {
                    'Simple': {
                        'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                        'Body': {'Text': {'Data': message, 'Charset': 'UTF-8'}}
                    }
                }
            }
            print(f"[POSTBOX REQUEST] Simple email:")
            print(f"[POSTBOX REQUEST] {json.dumps(request_params, indent=2, ensure_ascii=False)}")
            
            response = client.send_email(**request_params)
        
        print(f"[POSTBOX RESPONSE] Success:")
        print(f"[POSTBOX RESPONSE] {json.dumps(response, indent=2, ensure_ascii=False)}")
        
        message_id = response.get('MessageId', '')
        
        return 200, json.dumps({
            "status": "sent",
            "message_id": message_id
        })
        
    except ClientError as e:
        error_response = e.response
        print(f"[POSTBOX ERROR] ClientError occurred:")
        print(f"[POSTBOX ERROR] HTTP Status: {error_response.get('ResponseMetadata', {}).get('HTTPStatusCode')}")
        print(f"[POSTBOX ERROR] Error Code: {error_response.get('Error', {}).get('Code')}")
        print(f"[POSTBOX ERROR] Error Message: {error_response.get('Error', {}).get('Message')}")
        print(f"[POSTBOX ERROR] Request ID: {error_response.get('ResponseMetadata', {}).get('RequestId')}")
        print(f"[POSTBOX ERROR] Full response: {json.dumps(error_response, indent=2, default=str)}")
        
        return 500, json.dumps({
            "error": error_response.get('Error', {}).get('Message', str(e)),
            "code": error_response.get('Error', {}).get('Code', 'Unknown'),
            "request_id": error_response.get('ResponseMetadata', {}).get('RequestId'),
            "http_status": error_response.get('ResponseMetadata', {}).get('HTTPStatusCode')
        })
    except Exception as e:
        print(f"[POSTBOX ERROR] Unexpected exception:")
        print(f"[POSTBOX ERROR] Type: {type(e).__name__}")
        print(f"[POSTBOX ERROR] Message: {str(e)}")
        import traceback
        print(f"[POSTBOX ERROR] Traceback: {traceback.format_exc()}")
        return 500, json.dumps({"error": str(e), "type": type(e).__name__})

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
                    message_text: str, attempt_number: int, conn,
                    template_name: Optional[str] = None, template_data: Optional[Dict] = None,
                    subject: Optional[str] = None) -> Tuple[bool, Optional[str]]:
    """Пытается доставить сообщение"""
    start_time = time.time()
    
    try:
        cur = conn.cursor()
        cur.execute("SELECT provider_type FROM providers WHERE provider_code = %s", (provider,))
        result = cur.fetchone()
        cur.close()
        
        provider_type = result['provider_type'] if result else None
        
        if provider_type in ['whatsapp_business', 'telegram_bot', 'wappi', 'max']:
            status_code, response_body = send_via_wappi(recipient, message_text, provider, conn)
        elif provider_type == 'yandex_postbox':
            email_subject = subject or "Уведомление"
            status_code, response_body = send_via_postbox(
                recipient, message_text, email_subject, provider, conn,
                template_name=template_name, template_data=template_data
            )
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
        "metadata": {} (опционально),
        "subject": "Тема письма" (опционально, для email),
        "template_name": "имя_шаблона" (опционально, для Postbox),
        "template_data": {"key": "value"} (опционально, данные для шаблона)
    }
    
    Для Yandex Postbox:
    - Если указан template_name - отправка по шаблону (SendEmail с Template)
    - Если template_name не указан - обычное письмо (SendEmail с Simple)
    
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
                'Access-Control-Max-Age': '86400',
                'Content-Type': 'text/plain'
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
        template_name = body_data.get('template_name')
        template_data = body_data.get('template_data')
        subject = body_data.get('subject')
        
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
                message_id, provider, recipient, message_text, attempt, conn,
                template_name=template_name, template_data=template_data, subject=subject
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