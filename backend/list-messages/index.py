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
    
    cursor.execute(
        f"""
        SELECT message_id, recipient, provider, status, attempts, max_attempts, created_at 
        FROM messages 
        ORDER BY created_at DESC 
        LIMIT {limit}
        """
    )
    
    rows = cursor.fetchall()
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
            'count': len(messages)
        }),
        'isBase64Encoded': False
    }