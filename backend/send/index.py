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
        import hashlib
        import hmac
        
        access_key, secret_key, from_email = get_postbox_credentials(provider, conn)
        
        if not access_key or not secret_key or not from_email:
            return 500, json.dumps({"error": "Postbox credentials not configured"})
        
        print(f"[POSTBOX] Using Basic Auth with AWS SigV4")
        print(f"[POSTBOX] From: {from_email}")
        print(f"[POSTBOX] To: {recipient}")
        print(f"[POSTBOX] Subject: {subject}")
        
        # Подготовка body запроса
        if template_name:
            body = json.dumps({
                "FromEmailAddress": from_email,
                "Destination": {
                    "ToAddresses": [recipient]
                },
                "Content": {
                    "Template": {
                        "TemplateName": template_name,
                        "TemplateData": json.dumps(template_data or {})
                    }
                }
            })
        else:
            body = json.dumps({
                "FromEmailAddress": from_email,
                "Destination": {
                    "ToAddresses": [recipient]
                },
                "Content": {
                    "Simple": {
                        "Subject": {
                            "Data": subject,
                            "Charset": "UTF-8"
                        },
                        "Body": {
                            "Text": {
                                "Data": message,
                                "Charset": "UTF-8"
                            }
                        }
                    }
                }
            })
        
        # AWS Signature V4
        method = 'POST'
        service = 'ses'
        host = 'postbox.cloud.yandex.net'
        region = 'ru-central1'
        endpoint = f'https://{host}/v2/email/outbound-emails'
        content_type = 'application/json'
        
        t = datetime.utcnow()
        amz_date = t.strftime('%Y%m%dT%H%M%SZ')
        date_stamp = t.strftime('%Y%m%d')
        
        canonical_uri = '/v2/email/outbound-emails'
        canonical_querystring = ''
        canonical_headers = f'content-type:{content_type}\nhost:{host}\nx-amz-date:{amz_date}\n'
        signed_headers = 'content-type;host;x-amz-date'
        payload_hash = hashlib.sha256(body.encode('utf-8')).hexdigest()
        canonical_request = f'{method}\n{canonical_uri}\n{canonical_querystring}\n{canonical_headers}\n{signed_headers}\n{payload_hash}'
        
        algorithm = 'AWS4-HMAC-SHA256'
        credential_scope = f'{date_stamp}/{region}/{service}/aws4_request'
        string_to_sign = f'{algorithm}\n{amz_date}\n{credential_scope}\n' + hashlib.sha256(canonical_request.encode('utf-8')).hexdigest()
        
        def sign(key, msg):
            return hmac.new(key, msg.encode('utf-8'), hashlib.sha256).digest()
        
        k_date = sign(('AWS4' + secret_key).encode('utf-8'), date_stamp)
        k_region = sign(k_date, region)
        k_service = sign(k_region, service)
        k_signing = sign(k_service, 'aws4_request')
        
        signature = hmac.new(k_signing, string_to_sign.encode('utf-8'), hashlib.sha256).hexdigest()
        authorization_header = f'{algorithm} Credential={access_key}/{credential_scope}, SignedHeaders={signed_headers}, Signature={signature}'
        
        headers = {
            'Content-Type': content_type,
            'X-Amz-Date': amz_date,
            'Authorization': authorization_header
        }
        
        print(f"[POSTBOX] Request body: {body}")
        
        response = requests.post(
            endpoint,
            headers=headers,
            data=body,
            timeout=30
        )
        
        print(f"[POSTBOX] Response status: {response.status_code}")
        print(f"[POSTBOX] Response body: {response.text}")
        
        if response.status_code == 200:
            return 200, response.text
        else:
            return response.status_code, response.text
        
    except Exception as e:
        print(f"[POSTBOX ERROR] Unexpected exception:")
        print(f"[POSTBOX ERROR] Type: {type(e).__name__}")
        print(f"[POSTBOX ERROR] Message: {str(e)}")
        import traceback
        print(f"[POSTBOX ERROR] Traceback: {traceback.format_exc()}")
        return 500, json.dumps({"error": str(e), "type": type(e).__name__})

def get_apns_credentials(provider: str, conn) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
    """Получает APNs credentials из конфига"""
    cur = conn.cursor()
    cur.execute(
        "SELECT config FROM providers WHERE provider_code = %s",
        (provider,)
    )
    result = cur.fetchone()
    cur.close()
    
    if not result or not result['config']:
        return None, None, None, None
    
    config = result['config']
    return (config.get('apns_team_id'), config.get('apns_key_id'), 
            config.get('apns_private_key'), config.get('apns_bundle_id'))

def send_via_apns(recipient: str, message: str, provider: str, conn, 
                  title: Optional[str] = None, data: Optional[Dict] = None) -> Tuple[int, str]:
    """Отправляет push-уведомление через Apple Push Notification service (APNs)"""
    try:
        import jwt
        from datetime import datetime, timedelta
        
        team_id, key_id, private_key, bundle_id = get_apns_credentials(provider, conn)
        
        if not team_id or not key_id or not private_key or not bundle_id:
            return 500, json.dumps({"error": "APNs credentials not configured"})
        
        print(f"[APNS] Sending push notification")
        print(f"[APNS] Team ID: {team_id}")
        print(f"[APNS] Key ID: {key_id}")
        print(f"[APNS] Bundle ID: {bundle_id}")
        print(f"[APNS] Device Token: {recipient[:20]}...")
        
        token_claims = {
            'iss': team_id,
            'iat': datetime.utcnow()
        }
        
        token_headers = {
            'alg': 'ES256',
            'kid': key_id
        }
        
        auth_token = jwt.encode(
            token_claims,
            private_key,
            algorithm='ES256',
            headers=token_headers
        )
        
        apns_url = f"https://api.push.apple.com/3/device/{recipient}"
        
        payload = {
            "aps": {
                "alert": {
                    "body": message
                },
                "sound": "default"
            }
        }
        
        if title:
            payload["aps"]["alert"]["title"] = title
        
        if data:
            payload.update(data)
        
        print(f"[APNS] URL: {apns_url}")
        print(f"[APNS] Payload: {json.dumps(payload)}")
        
        response = requests.post(
            apns_url,
            headers={
                'authorization': f'bearer {auth_token}',
                'apns-topic': bundle_id,
                'apns-push-type': 'alert',
                'apns-priority': '10'
            },
            json=payload,
            timeout=10
        )
        
        print(f"[APNS] Response status: {response.status_code}")
        print(f"[APNS] Response body: {response.text}")
        
        if response.status_code == 200:
            return 200, json.dumps({"success": True, "apns_id": response.headers.get('apns-id')})
        else:
            return response.status_code, response.text
        
    except ImportError:
        return 500, json.dumps({"error": "PyJWT library not installed"})
    except Exception as e:
        print(f"[APNS ERROR] {str(e)}")
        return 500, json.dumps({"error": str(e)})

def get_fcm_credentials(provider: str, conn) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """Получает FCM credentials из конфига"""
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
    return (config.get('fcm_project_id'), config.get('fcm_private_key'), 
            config.get('fcm_client_email'))

def send_via_fcm(recipient: str, message: str, provider: str, conn,
                 title: Optional[str] = None, data: Optional[Dict] = None) -> Tuple[int, str]:
    """Отправляет push-уведомление через Firebase Cloud Messaging (FCM)"""
    try:
        from google.oauth2 import service_account
        from google.auth.transport.requests import Request
        
        project_id, private_key, client_email = get_fcm_credentials(provider, conn)
        
        if not project_id or not private_key or not client_email:
            return 500, json.dumps({"error": "FCM credentials not configured"})
        
        print(f"[FCM] Sending push notification")
        print(f"[FCM] Project ID: {project_id}")
        print(f"[FCM] Device Token: {recipient[:20]}...")
        
        credentials_dict = {
            "type": "service_account",
            "project_id": project_id,
            "private_key": private_key,
            "client_email": client_email,
            "token_uri": "https://oauth2.googleapis.com/token"
        }
        
        credentials = service_account.Credentials.from_service_account_info(
            credentials_dict,
            scopes=['https://www.googleapis.com/auth/firebase.messaging']
        )
        credentials.refresh(Request())
        
        fcm_url = f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"
        
        payload = {
            "message": {
                "token": recipient,
                "notification": {
                    "body": message
                }
            }
        }
        
        if title:
            payload["message"]["notification"]["title"] = title
        
        if data:
            payload["message"]["data"] = {k: str(v) for k, v in data.items()}
        
        print(f"[FCM] URL: {fcm_url}")
        print(f"[FCM] Payload: {json.dumps(payload)}")
        
        response = requests.post(
            fcm_url,
            headers={
                'Authorization': f'Bearer {credentials.token}',
                'Content-Type': 'application/json'
            },
            json=payload,
            timeout=10
        )
        
        print(f"[FCM] Response status: {response.status_code}")
        print(f"[FCM] Response body: {response.text}")
        
        if response.status_code == 200:
            return 200, response.text
        else:
            return response.status_code, response.text
        
    except ImportError:
        return 500, json.dumps({"error": "Google libraries not installed"})
    except Exception as e:
        print(f"[FCM ERROR] {str(e)}")
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
                    message_text: str, attempt_number: int, conn,
                    template_name: Optional[str] = None, template_data: Optional[Dict] = None,
                    subject: Optional[str] = None, title: Optional[str] = None,
                    data: Optional[Dict] = None) -> Tuple[bool, Optional[str]]:
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
        elif provider_type == 'fcm':
            status_code, response_body = send_via_fcm(recipient, message_text, provider, conn, 
                                                      title=title, data=data)
        elif provider_type == 'apns':
            status_code, response_body = send_via_apns(recipient, message_text, provider, conn,
                                                       title=title, data=data)
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
        title = body_data.get('title')
        data = body_data.get('data')
        
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
                template_name=template_name, template_data=template_data, subject=subject,
                title=title, data=data
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