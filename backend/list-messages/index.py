import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Получение списка сообщений из базы данных
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'success': False, 'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    headers = event.get('headers', {})
    api_key = headers.get('x-api-key') or headers.get('X-Api-Key')
    
    if not api_key:
        return {
            'statusCode': 401,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'success': False, 'error': 'Missing API key'}),
            'isBase64Encoded': False
        }
    
    query_params = event.get('queryStringParameters') or {}
    limit = int(query_params.get('limit', 50))
    limit = min(max(limit, 1), 100)
    offset = max(int(query_params.get('offset', 0)), 0)
    search = (query_params.get('q') or '').strip()
    status_filter = (query_params.get('status') or '').strip()
    provider_filter = (query_params.get('provider') or '').strip()
    try:
        days = int(query_params.get('days') or 0)
    except ValueError:
        days = 0
    message_id = query_params.get('message_id')
    
    conn = psycopg2.connect(
        os.environ['DATABASE_URL'],
        cursor_factory=RealDictCursor
    )
    cursor = conn.cursor()
    
    api_key_escaped = api_key.replace("'", "''")
    cursor.execute(
        f"SELECT id FROM api_keys WHERE api_key = '{api_key_escaped}' AND is_active = TRUE"
    )
    key_row = cursor.fetchone()
    
    if not key_row:
        cursor.close()
        conn.close()
        return {
            'statusCode': 401,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'success': False, 'error': 'Invalid API key'}),
            'isBase64Encoded': False
        }
    
    cursor.execute(
        f"UPDATE api_keys SET last_used_at = NOW() WHERE api_key = '{api_key_escaped}'"
    )
    conn.commit()
    
    if message_id:
        message_id_escaped = message_id.replace("'", "''")
        cursor.execute(
            f"""
            SELECT message_id, recipient, provider, message_text, status, attempts, max_attempts, created_at 
            FROM messages 
            WHERE message_id = '{message_id_escaped}'
            """
        )
        msg_row = cursor.fetchone()
        
        if not msg_row:
            cursor.close()
            conn.close()
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'success': False, 'error': 'Message not found'}),
                'isBase64Encoded': False
            }
        
        cursor.execute(
            f"""
            SELECT id, status, response_code, response_body, error_message, attempted_at 
            FROM delivery_attempts 
            WHERE message_id = '{message_id_escaped}'
            ORDER BY attempted_at
            """
        )
        attempts_rows = cursor.fetchall()
        
        delivery_attempts = []
        for att in attempts_rows:
            delivery_attempts.append({
                'id': att['id'],
                'status': att['status'],
                'response_code': att['response_code'],
                'response_body': att['response_body'],
                'error_message': att['error_message'],
                'attempted_at': att['attempted_at'].isoformat() if att['attempted_at'] else None
            })
        
        message_detail = {
            'message_id': msg_row['message_id'],
            'recipient': msg_row['recipient'],
            'provider': msg_row['provider'],
            'message_text': msg_row['message_text'],
            'status': msg_row['status'],
            'attempts': msg_row['attempts'],
            'max_attempts': msg_row['max_attempts'],
            'created_at': msg_row['created_at'].isoformat() if msg_row['created_at'] else None,
            'delivery_attempts': delivery_attempts
        }
        
        cursor.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': True,
                'message': message_detail
            }),
            'isBase64Encoded': False
        }
    
    where = []
    params = []
    if status_filter:
        where.append('status = %s')
        params.append(status_filter)
    if provider_filter:
        where.append('provider = %s')
        params.append(provider_filter)
    if days > 0:
        where.append("created_at >= NOW() - (%s * INTERVAL '1 day')")
        params.append(days)
    if search:
        like = '%' + search.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_') + '%'
        where.append('(message_id ILIKE %s OR recipient ILIKE %s OR provider ILIKE %s OR status ILIKE %s OR message_text ILIKE %s)')
        params.extend([like] * 5)
    where_sql = ('WHERE ' + ' AND '.join(where)) if where else ''

    total = None
    statuses = None
    providers_list = None
    if offset == 0:
        cursor.execute(f'SELECT COUNT(*) AS c FROM messages {where_sql}', params)
        total = cursor.fetchone()['c']
        cursor.execute('SELECT DISTINCT status FROM messages WHERE status IS NOT NULL ORDER BY status')
        statuses = [r['status'] for r in cursor.fetchall()]
        cursor.execute('SELECT DISTINCT provider FROM messages WHERE provider IS NOT NULL ORDER BY provider')
        providers_list = [r['provider'] for r in cursor.fetchall()]

    cursor.execute(
        f"""
        SELECT message_id, recipient, provider, status, attempts, max_attempts, created_at 
        FROM messages 
        {where_sql}
        ORDER BY created_at DESC 
        LIMIT {limit + 1} OFFSET {offset}
        """,
        params
    )
    
    rows = cursor.fetchall()
    has_more = len(rows) > limit
    rows = rows[:limit]
    messages = []
    
    for row in rows:
        messages.append({
            'message_id': row['message_id'],
            'recipient': row['recipient'],
            'provider': row['provider'],
            'status': row['status'],
            'attempts': row['attempts'],
            'max_attempts': row['max_attempts'],
            'created_at': row['created_at'].isoformat() if row['created_at'] else None
        })
    
    cursor.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'success': True,
            'messages': messages,
            'count': len(messages),
            'has_more': has_more,
            'total': total,
            'statuses': statuses,
            'providers': providers_list
        }),
        'isBase64Encoded': False
    }