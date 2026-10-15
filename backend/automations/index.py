import payti


def handler(event, context):
    """Автоматизации: создание личных кабинетов в Екомкасса (Payti) по хукам из Битрикс24"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**payti.CORS, 'Access-Control-Max-Age': '86400'}, 'body': '', 'isBase64Encoded': False}
    action = (event.get('queryStringParameters') or {}).get('action', '')
    if action not in payti.ACTIONS:
        return payti.resp(400, {'error': 'Unknown action'})
    return payti.handle(event, action)
