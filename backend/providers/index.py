import json
import os
from typing import Dict, Any
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

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Управляет настройками провайдеров
    
    GET /api/providers - получить список провайдеров
    GET /api/providers/config?provider_code=wappi - получить конфиг провайдера
    POST /api/providers/config - сохранить конфиг провайдера
        Body: {
            "provider_code": "whatsapp_business",
            "wappi_token": "...",
            "wappi_profile_id": "..."
        }
    """
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
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
        
        if method == 'GET':
            path = event.get('path', '')
            params = event.get('queryStringParameters') or {}
            
            if '/config' in path:
                provider_code = params.get('provider_code')
                
                if not provider_code:
                    conn.close()
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Missing provider_code parameter'}),
                        'isBase64Encoded': False
                    }
                
                cur = conn.cursor()
                cur.execute(
                    "SELECT config FROM providers WHERE provider_code = %s",
                    (provider_code,)
                )
                result = cur.fetchone()
                cur.close()
                conn.close()
                
                if not result:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Provider not found'}),
                        'isBase64Encoded': False
                    }
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'success': True,
                        'provider_code': provider_code,
                        'config': result['config']
                    }),
                    'isBase64Encoded': False
                }
            else:
                cur = conn.cursor()
                cur.execute(
                    """SELECT 
                        p.provider_code, 
                        p.provider_name, 
                        p.provider_type, 
                        p.is_active, 
                        p.config,
                        p.connection_status, 
                        p.created_at, 
                        p.updated_at,
                        da.status as last_attempt_status,
                        da.response_code as last_response_code,
                        da.attempted_at as last_attempt_at
                    FROM providers p
                    LEFT JOIN LATERAL (
                        SELECT status, response_code, attempted_at
                        FROM delivery_attempts
                        WHERE provider = p.provider_code
                        ORDER BY attempted_at DESC
                        LIMIT 1
                    ) da ON true
                    ORDER BY p.provider_name"""
                )
                providers = cur.fetchall()
                cur.close()
                conn.close()
                
                result = []
                for p in providers:
                    has_config = p['config'] and len(p['config']) > 0
                    last_status = p['last_attempt_status']
                    last_code = p['last_response_code']
                    last_attempt_at = p['last_attempt_at']
                    updated_at = p['updated_at']
                    
                    # Use stored connection_status as base, but update based on delivery attempts
                    connection_status = p.get('connection_status', 'not_configured')
                    
                    if not has_config:
                        connection_status = 'not_configured'
                    elif last_status and last_attempt_at:
                        # Only use delivery attempt status if it's newer than config update
                        if last_attempt_at > updated_at:
                            if last_status == 'success' and last_code == 200:
                                connection_status = 'working'
                            else:
                                connection_status = 'error'
                        # Otherwise keep stored connection_status (configured after recent update)
                    # Otherwise keep stored connection_status (configured/not_configured)
                    
                    result.append({
                        'provider_code': p['provider_code'],
                        'provider_name': p['provider_name'],
                        'provider_type': p['provider_type'],
                        'is_active': p['is_active'],
                        'config': p['config'],
                        'connection_status': connection_status,
                        'last_attempt_status': last_status,
                        'last_response_code': last_code,
                        'last_attempt_at': p['last_attempt_at'].isoformat() if p['last_attempt_at'] else None,
                        'created_at': p['created_at'].isoformat() if p['created_at'] else None,
                        'updated_at': p['updated_at'].isoformat() if p['updated_at'] else None
                    })
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'success': True,
                        'providers': result
                    }),
                    'isBase64Encoded': False
                }
        
        elif method == 'PUT':
            body_data = json.loads(event.get('body', '{}'))
            
            provider_code = body_data.get('provider_code')
            provider_name = body_data.get('provider_name')
            provider_type = body_data.get('provider_type')
            wappi_token = body_data.get('wappi_token')
            wappi_profile_id = body_data.get('wappi_profile_id')
            postbox_access_key = body_data.get('postbox_access_key')
            postbox_secret_key = body_data.get('postbox_secret_key')
            postbox_from_email = body_data.get('postbox_from_email')
            fcm_project_id = body_data.get('fcm_project_id')
            fcm_private_key = body_data.get('fcm_private_key')
            fcm_client_email = body_data.get('fcm_client_email')
            apns_team_id = body_data.get('apns_team_id')
            apns_key_id = body_data.get('apns_key_id')
            apns_private_key = body_data.get('apns_private_key')
            apns_bundle_id = body_data.get('apns_bundle_id')
            
            if not provider_code:
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Missing provider_code'}),
                    'isBase64Encoded': False
                }
            
            config = {}
            if wappi_token:
                config['wappi_token'] = wappi_token
            if wappi_profile_id:
                config['wappi_profile_id'] = wappi_profile_id
            if postbox_access_key:
                config['postbox_access_key'] = postbox_access_key
            if postbox_secret_key:
                config['postbox_secret_key'] = postbox_secret_key
            if postbox_from_email:
                config['postbox_from_email'] = postbox_from_email
            if fcm_project_id:
                config['fcm_project_id'] = fcm_project_id
            if fcm_private_key:
                config['fcm_private_key'] = fcm_private_key
            if fcm_client_email:
                config['fcm_client_email'] = fcm_client_email
            if apns_team_id:
                config['apns_team_id'] = apns_team_id
            if apns_key_id:
                config['apns_key_id'] = apns_key_id
            if apns_private_key:
                config['apns_private_key'] = apns_private_key
            if apns_bundle_id:
                config['apns_bundle_id'] = apns_bundle_id
            
            if not provider_name:
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Missing provider_name for new provider'}),
                    'isBase64Encoded': False
                }
            
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO providers 
                (provider_code, provider_name, provider_type, config, is_active, created_at, updated_at)
                VALUES (%s, %s, %s, %s, true, NOW(), NOW())
                RETURNING provider_code, provider_name, is_active""",
                (provider_code, provider_name, provider_type or 'custom', json.dumps(config))
            )
            
            result = cur.fetchone()
            conn.commit()
            cur.close()
            conn.close()
            
            if not result:
                return {
                    'statusCode': 500,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Failed to save provider'}),
                    'isBase64Encoded': False
                }
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'provider_code': result['provider_code'],
                    'provider_name': result['provider_name'],
                    'is_active': result['is_active'],
                    'message': 'Provider created successfully'
                }),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            
            provider_code = body_data.get('provider_code')
            wappi_token = body_data.get('wappi_token')
            wappi_profile_id = body_data.get('wappi_profile_id')
            postbox_access_key = body_data.get('postbox_access_key')
            postbox_secret_key = body_data.get('postbox_secret_key')
            postbox_from_email = body_data.get('postbox_from_email')
            fcm_project_id = body_data.get('fcm_project_id')
            fcm_private_key = body_data.get('fcm_private_key')
            fcm_client_email = body_data.get('fcm_client_email')
            apns_team_id = body_data.get('apns_team_id')
            apns_key_id = body_data.get('apns_key_id')
            apns_private_key = body_data.get('apns_private_key')
            apns_bundle_id = body_data.get('apns_bundle_id')
            
            if not provider_code:
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Missing provider_code'}),
                    'isBase64Encoded': False
                }
            
            config = {}
            if wappi_token:
                config['wappi_token'] = wappi_token
            if wappi_profile_id:
                config['wappi_profile_id'] = wappi_profile_id
            if postbox_access_key:
                config['postbox_access_key'] = postbox_access_key
            if postbox_secret_key:
                config['postbox_secret_key'] = postbox_secret_key
            if postbox_from_email:
                config['postbox_from_email'] = postbox_from_email
            if fcm_project_id:
                config['fcm_project_id'] = fcm_project_id
            if fcm_private_key:
                config['fcm_private_key'] = fcm_private_key
            if fcm_client_email:
                config['fcm_client_email'] = fcm_client_email
            if apns_team_id:
                config['apns_team_id'] = apns_team_id
            if apns_key_id:
                config['apns_key_id'] = apns_key_id
            if apns_private_key:
                config['apns_private_key'] = apns_private_key
            if apns_bundle_id:
                config['apns_bundle_id'] = apns_bundle_id
            
            cur = conn.cursor()
            cur.execute(
                """UPDATE providers 
                SET config = %s, updated_at = NOW(), is_active = true, connection_status = 'configured'
                WHERE provider_code = %s
                RETURNING provider_code, provider_name, is_active""",
                (json.dumps(config), provider_code)
            )
            
            result = cur.fetchone()
            conn.commit()
            cur.close()
            conn.close()
            
            if not result:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Provider not found'}),
                    'isBase64Encoded': False
                }
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'provider_code': result['provider_code'],
                    'provider_name': result['provider_name'],
                    'is_active': result['is_active'],
                    'message': 'Provider configuration updated successfully'
                }),
                'isBase64Encoded': False
            }
        
        elif method == 'DELETE':
            params = event.get('queryStringParameters') or {}
            provider_code = params.get('provider_code')
            
            if not provider_code:
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Missing provider_code parameter'}),
                    'isBase64Encoded': False
                }
            
            cur = conn.cursor()
            cur.execute(
                "DELETE FROM providers WHERE provider_code = %s RETURNING provider_code, provider_name",
                (provider_code,)
            )
            result = cur.fetchone()
            conn.commit()
            cur.close()
            conn.close()
            
            if not result:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Provider not found'}),
                    'isBase64Encoded': False
                }
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': True,
                    'provider_code': result['provider_code'],
                    'provider_name': result['provider_name'],
                    'message': f"Provider {result['provider_name']} deleted successfully"
                }),
                'isBase64Encoded': False
            }
        
        else:
            return {
                'statusCode': 405,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Method not allowed'}),
                'isBase64Encoded': False
            }
        
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {str(e)}")
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid JSON'}),
            'isBase64Encoded': False
        }
    except Exception as e:
        import traceback
        print(f"Exception: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)}),
            'isBase64Encoded': False
        }