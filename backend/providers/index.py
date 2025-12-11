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
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
                    
                    if not has_config:
                        connection_status = 'not_configured'
                    elif not last_status:
                        connection_status = 'configured'
                    elif last_status == 'success' and last_code == 200:
                        connection_status = 'working'
                    else:
                        connection_status = 'error'
                    
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
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            
            provider_code = body_data.get('provider_code')
            provider_name = body_data.get('provider_name')
            provider_type = body_data.get('provider_type')
            wappi_token = body_data.get('wappi_token')
            wappi_profile_id = body_data.get('wappi_profile_id')
            
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
            
            cur = conn.cursor()
            
            cur.execute(
                "SELECT provider_code FROM providers WHERE provider_code = %s",
                (provider_code,)
            )
            existing = cur.fetchone()
            
            if existing:
                cur.execute(
                    """UPDATE providers 
                    SET config = %s, updated_at = NOW(), is_active = true
                    WHERE provider_code = %s
                    RETURNING provider_code, provider_name, is_active""",
                    (json.dumps(config), provider_code)
                )
            else:
                if not provider_name:
                    conn.close()
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Missing provider_name for new provider'}),
                        'isBase64Encoded': False
                    }
                
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
                    'message': 'Provider configuration saved successfully'
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