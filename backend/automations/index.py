import payti
import ofd
import fns
import details


def handler(event, context):
    """Автоматизации: создание личных кабинетов в Екомкасса (Payti) и ОФД.ру, заявки на регистрацию касс в ФНС по хукам из Битрикс24"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**payti.CORS, 'Access-Control-Max-Age': '86400'}, 'body': '', 'isBase64Encoded': False}
    action = (event.get('queryStringParameters') or {}).get('action', '')
    if action in payti.ACTIONS:
        return payti.handle(event, action)
    if action in ofd.ACTIONS:
        return ofd.handle(event, action)
    if action in fns.ACTIONS:
        return fns.handle(event, action)
    if action in details.ACTIONS:
        return details.handle(event, action)
    return payti.resp(400, {'error': 'Unknown action'})
