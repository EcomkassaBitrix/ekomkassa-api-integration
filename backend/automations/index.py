import payti
import ofd


def handler(event, context):
    """Автоматизации: создание личных кабинетов в Екомкасса (Payti) и ОФД.ру по хукам из Битрикс24"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**payti.CORS, 'Access-Control-Max-Age': '86400'}, 'body': '', 'isBase64Encoded': False}
    action = (event.get('queryStringParameters') or {}).get('action', '')
    if action in payti.ACTIONS:
        return payti.handle(event, action)
    if action in ofd.ACTIONS:
        return ofd.handle(event, action)
    return payti.resp(400, {'error': 'Unknown action'})
